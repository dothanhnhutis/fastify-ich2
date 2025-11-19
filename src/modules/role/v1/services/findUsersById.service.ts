import type { UserWithoutPassword } from "@modules/shared/user/user.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import { isDateString } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

export default class FindUsersByIdService extends BaseRoleService {
  async execute(
    roleId: string,
    query?: RoleRequestType["GetUsersById"]["Querystring"]
  ) {
    const newTable = `
          WITH
            users AS (
              SELECT
                  u.id,
                  u.email,
                  (u.password_hash IS NOT NULL)::boolean AS has_password,
                  u.username,
                  u.status,
                  u.deactived_at,
                  u.created_at,
                  u.updated_at,
                  CASE
                    WHEN av.file_id IS NOT NULL THEN 
                      json_build_object(
                        'id',
                        av.file_id,
                        'width',
                        av.width,
                        'height',
                        av.height,
                        'is_primary',
                        av.is_primary,
                        'original_name',
                        f.original_name,
                        'mime_type',
                        f.mime_type,
                        'destination',
                        f.destination,
                        'file_name',
                        f.file_name,
                        'size',
                        f.size,
                        'created_at',
                        to_char(
                            av.created_at AT TIME ZONE 'UTC',
                            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                            )
                        )
                    ELSE null
                  END AS avatar
              FROM
                  user_roles ur
                  LEFT JOIN users u ON (u.id = ur.user_id)
                  LEFT JOIN user_avatars av ON (u.id = av.user_id)
                  LEFT JOIN files f ON f.id = av.file_id
              WHERE
                  ur.role_id = $1::text
                  AND u.status = 'ACTIVE'
                  AND u.deactived_at IS NULL
            )
          `;

    const queryString = [`SELECT * FROM users`];

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

    if (where.length > 0) {
      queryString.push(`WHERE ${where.join(" AND ")}`);
    }

    const logService = this.log.child({
      service: "FindUsersByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: [newTable, queryString.join(" ").replace("*", "count(*)")].join(
        " "
      ),
      values,
    };

    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const { rows } = await client.query<{ count: string }>(queryConfig);

      logService.info(
        {
          step: "1/2",
          stepOperation: "db.select",
          queryConfig,
        },
        `Có ${rows[0].count} kết quả.`
      );
      const totalItem = parseInt(rows[0].count, 10);

      if (query?.sort !== undefined) {
        queryString.push(
          `ORDER BY ${query.sort
            .map((sort) => {
              const [field, direction] = sort.split(".");
              return `${field} ${direction.toUpperCase()}`;
            })
            .join(", ")}`
        );
      }

      const limit = query?.limit ?? totalItem;
      const page = query?.page ?? 1;
      const offset = (page - 1) * limit;

      queryString.push(`LIMIT $${idx++}::int OFFSET $${idx}::int`);
      values.push(limit, offset);

      queryConfig = {
        text: [newTable, queryString.join(" ")].join(" "),
        values,
      };

      const { rows: users } = await client.query<
        Omit<UserWithoutPassword, "role_count">
      >(queryConfig);
      logService.info(
        {
          step: "2/2",
          stepOperation: "db.select",
          queryConfig,
        },
        "Truy vấn với sắp xếp và phân trang thành công."
      );
      const totalPage = Math.ceil(totalItem / limit) || 0;
      await client.query("COMMIT");
      logService.info("Truy vấn người dùng thành công.");
      return {
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
    } catch (error: unknown) {
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info("Rollback thành công.");
        } catch (rollbackErr) {
          logService.error({ error: rollbackErr }, "Rollback failed");
        }
      }
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
        `Lỗi khi truy vấn người dùng database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
