import type { Metadata, UserWithoutPassword } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy, isDateString } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

const sortFieldMap: Record<string, string> = {
  username: "username",
  email: "email",
  status: "status",
  deactived_at: "deactived_at",
  created_at: "created_at",
  updated_at: "updated_at",
};

export default class FindUsersByIdService extends BaseRoleService {
  async execute(
    roleId: string,
    query?: RoleRequestType["GetUsersById"]["Querystring"]
  ): Promise<{
    users: UserWithoutPassword[];
    metadata: Metadata;
  }> {
    const cte = `
    WITH users AS 
    (
        SELECT u.id,
              u.username,
              u.email,
              (u.password_hash IS NOT NULL)::boolean AS has_password,
              u.status,
              u.deactivated_at,
              u.created_at,
              u.updated_at,
              (
                CASE
                WHEN f.id IS NOT NULL THEN 
                    json_build_object(
                        'id', ua.file_id,
                        'width', ua.width,
                        'height', ua.height,
                        'is_primary', ua.is_primary,
                        'original_name', f.original_name,
                        'mime_type', f.mime_type,
                        'destination', f.destination,
                        'file_name', f.file_name,
                        'size', f.size,
                        'created_at', to_char(ua.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                    ) 
                  END
              ) AS avatar
               FROM user_roles ur
                        INNER JOIN users u ON u.id = ur.user_id AND u.deactivated_at IS NULL
                        LEFT JOIN user_avatars ua
                                  ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
                        LEFT JOIN files f ON f.id = ua.file_id
               WHERE ur.role_id = $1::text
              
     )
    `;

    const baseSelect = `FROM users`;

    const values: (string | number)[] = [roleId];
    const where: string[] = [];
    let idx = 2;

    if (query) {
      if (query.email !== undefined) {
        where.push(`email ILIKE $${idx++}::text`);
        values.push(`%${query.email.trim()}%`);
      }

      if (query.username !== undefined) {
        where.push(`username ILIKE $${idx++}::text`);
        values.push(`%${query.username.trim()}%`);
      }

      if (query.status !== undefined) {
        where.push(`status = $${idx++}::text`);
        values.push(query.status);
      }

      if (query.created_from) {
        where.push(`created_at >= $${idx++}::timestamptz`);
        values.push(
          `${
            isDateString(query.created_from.trim())
              ? `${query.created_from.trim()}T00:00:00.000Z`
              : query.created_from.trim()
          }`
        );
      }

      if (query.created_to) {
        where.push(`created_at <= $${idx++}::timestamptz`);
        values.push(
          `${
            isDateString(query.created_to.trim())
              ? `${query.created_to.trim()}T23:59:59.999Z`
              : query.created_to.trim()
          }`
        );
      }
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const logService = this.log.child({
      service: "FindUsersByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: `
        ${cte}
        SELECT COUNT(*)::int AS count
        ${baseSelect}
        ${whereClause}
      `,
      values,
    };

    let client: PoolClient | null = null;
    let step: number = 0;
    let maxStep: number = 2;

    let result: {
      users: Omit<UserWithoutPassword, "role_count">[];
      metadata: Metadata;
    } = {
      users: [],
      metadata: {
        totalItem: 0,
        totalPage: 0,
        hasNextPage: false,
        limit: 0,
        itemStart: 0,
        itemEnd: 0,
      },
    };
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const { rows: countRows } = await client.query<{ count: number }>(
        queryConfig
      );
      const totalItem = countRows[0]?.count ?? 0;

      logService.info(
        {
          step: `${++step}/${totalItem === 0 ? --maxStep : maxStep}`,
          stepOperation: "db.select",
          queryConfig,
        },
        `[${step}/${maxStep}] Có ${totalItem} kết quả.`
      );

      if (totalItem > 0) {
        const orderByClause = buildOrderBy(sortFieldMap, query?.sort);

        const limit = query?.limit ?? totalItem;
        const page = query?.page ?? 1;
        const offset = (page - 1) * limit;

        queryConfig = {
          text: `
          ${cte}
          SELECT *
          ${baseSelect}
          ${whereClause}
          ${orderByClause}
          LIMIT $${idx++}::int OFFSET $${idx}::int
        `,
          values: [...values, limit, offset],
        };

        const { rows: users } = await client.query<
          Omit<UserWithoutPassword, "role_count">
        >(queryConfig);
        logService.info(
          {
            step: ++step,
            stepOperation: "db.select",
            queryConfig,
          },
          `[${step}/${maxStep}] Truy vấn với sắp xếp và phân trang thành công.`
        );
        const totalPage = Math.ceil(totalItem / limit) || 0;
        result = {
          users,
          metadata: {
            totalItem,
            totalPage,
            hasNextPage: page < totalPage,
            limit: totalItem > 0 ? limit : 0,
            itemStart: totalItem > 0 ? (page - 1) * limit + 1 : 0,
            itemEnd: Math.min(page * limit, totalItem),
          },
        };
      }

      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);
      return result;
    } catch (error: unknown) {
      logService.error(
        {
          error,
          database: {
            host: this.pool.options.host,
            port: this.pool.options.port,
            name: this.pool.options.database,
            pool: {
              total: this.pool.totalCount,
              idle: this.pool.idleCount,
              waiting: this.pool.waitingCount,
            },
          },
        },
        `[${step}/${maxStep}] Lỗi khi truy vấn tài khoản của roleId=${roleId} trong database.`
      );
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info(`[${step}/${maxStep}] Rollback thành công.`);
        } catch (rollbackErr) {
          logService.error(
            { error: rollbackErr },
            `[${step}/${maxStep}] Rollback thất bại.`
          );
        }
      }
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
