import type { Role } from "@modules/shared/role/role.shared.types";
import type { Metadata } from "@modules/shared/types";
import env from "@shared/config/env";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy, makeQueryCacheKey } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { UserRequestType } from "../user.schema";
import BaseUserService from "./base.service";

const sortFieldMap: Record<string, string> = {
  name: "name",
  permissions: "permissions",
  description: "description",
  deactived_at: "deactived_at",
  status: "status",
  created_at: "created_at",
  updated_at: "updated_at",
};

export default class FindRoleByIdService extends BaseUserService {
  async execute(
    userId: string,
    query?: UserRequestType["GetRolesById"]["Querystring"]
  ): Promise<{ roles: Role[]; metadata: Metadata }> {
    const logService = this.log.child({
      service: "FindRoleByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    const cte = `
          WITH
            roles AS (
                SELECT
                    r.*
                FROM
                    user_roles ur
                    LEFT JOIN roles r ON r.id = ur.role_id
                WHERE
                    ur.user_id = $1::text
                    AND r.status = 'ACTIVE'
                    AND r.deactived_at IS NULL
            )
        `;

    const baseSelect = `FROM roles`;

    const values: unknown[] = [userId];
    const where: string[] = [];
    let idx = 2;

    if (query) {
      if (query.name !== undefined) {
        where.push(`name ILIKE $${idx++}::text`);
        values.push(`%${query.name.trim()}%`);
      }

      if (query.permission !== undefined) {
        where.push(`permissions @> $${idx++}::text[]`);
        values.push(query.permission);
      }

      if (query.description !== undefined) {
        where.push(`description ILIKE $${idx++}::text`);
        values.push(`%${query.description.trim()}%`);
      }

      if (query.status !== undefined) {
        where.push(`status = $${idx++}::text`);
        values.push(`${query.status}`);
      }

      if (query.created_from) {
        where.push(`created_at >= $${idx++}::timestamptz`);
        values.push(query.created_from);
      }

      if (query.created_to) {
        where.push(`created_at <= $${idx++}::timestamptz`);
        values.push(query.created_to);
      }
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

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
    let step: number = 1;
    let maxStep: number = 2;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const { rows: countRows } = await client.query<{ count: number }>(
        queryConfig
      );
      const totalItem = countRows[0]?.count ?? 0;

      if (!totalItem) {
        await client.query("COMMIT");
        logService.info(
          {
            step: `${++step}/${--maxStep}`,
            stepOperation: "db.select",
            queryConfig,
          },
          `[${step}/${maxStep}] Có ${totalItem} kết quả.`
        );
        return {
          roles: [],
          metadata: {
            totalItem: 0,
            totalPage: 0,
            hasNextPage: false,
            limit: 0,
            itemStart: 0,
            itemEnd: 0,
          },
        };
      }

      logService.info(
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.select",
          queryConfig,
        },
        `[${step}/${maxStep}] Có ${totalItem} kết quả.`
      );

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

      const { rows: roles } = await client.query<Role>(queryConfig);
      logService.info(
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.select",
          queryConfig,
        },
        `[${step}/${maxStep}] Truy vấn với sắp xếp và phân trang thành công.`
      );

      const totalPage = Math.ceil(totalItem / limit);

      await client.query("COMMIT");
      logService.info(
        `[${step}/${maxStep}] Truy vấn truy vấn vai trò của userId=${userId} thành công.`
      );

      const result = {
        roles,
        metadata: {
          totalItem,
          totalPage,
          hasNextPage: page < totalPage,
          limit: totalItem > 0 ? limit : 0,
          itemStart: totalItem > 0 ? (page - 1) * limit + 1 : 0,
          itemEnd: Math.min(page * limit, totalItem),
        },
      };

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
        `[${step}/${maxStep}] Lỗi khi truy vấn vai trò của userId=${userId} database.`
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

  async findUserRoleQuery(
    userId: string,
    query?: UserRequestType["GetRolesById"]["Querystring"]
  ) {
    const logService = this.log.child({
      service: "FindRoleByIdService.findUserRoleQuery",
      source: "cache",
      operation: "db.get",
      comman: "GET user:[userId]:roles:query",
    });
    const key = makeQueryCacheKey(`user:${userId}:roles:query`, query);

    try {
      const data = await this.redis.get(key);
      if (!data) {
        logService.info(`Truy vấn key='${key}' thất bại.`);
        return null;
      }
      logService.info(`Truy vấn key='${key}' thành công.`);

      return JSON.parse(data) as {
        roles: Role[];
        metadata: Metadata;
      };
    } catch (error) {
      logService.warn({ error }, `Lỗi truy key='${key}'`);
      return null;
    }
  }

  async saveUserRoleQuery(
    {
      userId,
      query,
    }: {
      userId: string;
      query?: UserRequestType["GetRolesById"]["Querystring"];
    },
    data: { roles: Role[]; metadata: Metadata }
  ): Promise<void> {
    const logService = this.log.child({
      service: "FindRoleByIdService.saveUserRoleQuery",
      source: "cache",
      operation: "db.set",
      comman: "SET data->user:[userId]:roles:query",
    });
    const key = makeQueryCacheKey(`user:${userId}:roles:query`, query);
    try {
      const isOK = await this.redis.set(
        key,
        JSON.stringify(data),
        "EX",
        env.REDIS_TTL
      );
      if (!isOK) {
        logService.info(`Lưu data vào key=${key} thất bại.`);
      }
      logService.info(`Lưu data vào key=${key} thành công.`);
    } catch (error) {
      logService.warn({ error }, `Lỗi khi lưu vào key=${key} cache.`);
    }
  }
}
