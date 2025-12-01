import type { Metadata } from "@modules/shared/types";
import env from "@shared/config/env";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy, makeQueryCacheKey } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { UserDetailWithoutPassword, UserRequestType } from "../user.types";
import BaseUserService from "./base.service";

const sortFieldMap: Record<string, string> = {
  username: "u.username",
  email: "u.email",
  status: "u.status",
  disabled_at: "u.disabled_at",
  created_at: "u.created_at",
  updated_at: "u.updated_at",
};

export default class FindManyService extends BaseUserService {
  async execute(
    query: UserRequestType["Query"]["Querystring"]
  ): Promise<{ users: UserDetailWithoutPassword[]; metadata: Metadata }> {
    const baseSelect = `
    SELECT u.id,
          u.username,
          u.email,
          (u.password_hash IS NOT NULL)::boolean AS has_password,
          u.status,
          u.disabled_at,
          u.deleted_at,
          u.created_at,
          u.updated_at,
          COUNT(r.id)::int AS role_count,
          COALESCE(
                          json_agg(
                          json_build_object(
                                  'id', r.id,
                                  'name', r.name,
                                  'permissions', r.permissions,
                                  'description', r.description,
                                  'status', r.status,
                                  'disabled_at', r.disabled_at,
                                  'deleted_at', r.deleted_at,
                                  'can_delete', r.can_delete,
                                  'can_update', r.can_update,
                                  'created_at', r.created_at,
                                  'updated_at', r.updated_at
                          )
                                  ) FILTER ( WHERE r.id IS NOT NULL ), '[]'
          )                      AS roles
    FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL AND r.status = 'ACTIVE' AND r.disabled_at IS NULL
            LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
            LEFT JOIN files f ON f.id = ua.file_id
    `;

    let idx = 1;
    const values: unknown[] = [];
    const where: string[] = ["u.deleted_at IS NULL"];

    if (query.id !== undefined) {
      where.push(`u.id = ANY($${idx++}::text[])`);
      values.push(query.id);
    }

    if (query.username !== undefined) {
      where.push(`u.username ILIKE $${idx++}::text`);
      values.push(`%${query.username}%`);
    }

    if (query.email !== undefined) {
      where.push(`u.email ILIKE $${idx++}::text`);
      values.push(`%${query.email}%`);
    }

    if (query.status !== undefined) {
      where.push(`u.status = $${idx++}::text`);
      values.push(`${query.status}`);
    }

    if (query.created_from !== undefined) {
      where.push(`u.created_at >= $${idx++}::timestamptz`);
      values.push(query.created_from);
    }

    if (query.created_to !== undefined) {
      where.push(`u.created_at <= $${idx++}::timestamptz`);
      values.push(query.created_to);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const groupByClause = `GROUP BY u.id, u.email, u.password_hash, u.username,
    u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at, ua.file_id, ua.height,
    ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name,
    f.size, ua.created_at`;

    const logService = this.log.child({
      service: "FindManyService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: `WITH users AS (
      ${baseSelect}
      ${whereClause}
      ${groupByClause}
      )
      SELECT COUNT(*)::int AS count FROM users;`,
      values,
    };
    let client: PoolClient | null = null;
    let step: number = 0;
    let maxStep: number = 2;
    let result: { users: UserDetailWithoutPassword[]; metadata: Metadata } = {
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
        const orderByClause = buildOrderBy(sortFieldMap, query.sort);
        const limit = query.limit ?? totalItem;
        const page = query.page ?? 1;
        const offset = (page - 1) * limit;

        queryConfig = {
          text: `
          ${baseSelect}
          ${whereClause}
          ${groupByClause}
          ${orderByClause}
          LIMIT $${idx++}::int OFFSET $${idx}::int
        `,
          values: [...values, limit, offset],
        };

        const { rows: users } = await client.query<UserDetailWithoutPassword>(
          queryConfig
        );
        logService.info(
          {
            operation: "db.transaction",
            step: `${++step}/${maxStep}`,
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
          queryConfig,
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
        `[${step}/${maxStep}] Lỗi khi truy vấn tài khoản database.`
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

  async findManyCache(query: UserRequestType["Query"]["Querystring"]): Promise<{
    users: UserDetailWithoutPassword[];
    metadata: Metadata;
  } | null> {
    const logService = this.log.child({
      service: "FindManyService.findMany",
      source: "cache",
      operation: "db.get",
      comman: "GET user:query:[key]",
    });

    const userQueryKey = makeQueryCacheKey("user:query", query);

    try {
      const data = await this.redis.get(userQueryKey);
      if (!data) {
        logService.info(`Truy vấn key='${userQueryKey}' thất bại.`);
        return null;
      }
      logService.info(`Truy vấn key='${userQueryKey}' thành công.`);

      return JSON.parse(data) as {
        users: UserDetailWithoutPassword[];
        metadata: Metadata;
      };
    } catch (error) {
      logService.warn({ error }, `Lỗi truy key='${userQueryKey}'`);
      return null;
    }
  }

  async saveManyToCache(
    query: UserRequestType["Query"]["Querystring"],
    data: { users: UserDetailWithoutPassword[]; metadata: Metadata }
  ): Promise<void> {
    const logService = this.log.child({
      service: "FindManyService.findMany",
      source: "cache",
      operation: "db.set",
      comman: "SET data->user:query:[key]",
    });
    const userQueryKey = makeQueryCacheKey("user:query", query);

    try {
      const isOK = await this.redis.set(
        userQueryKey,
        JSON.stringify(data),
        "EX",
        env.REDIS_TTL
      );
      if (!isOK) {
        logService.info("Lưu data vào key thất bại.");
      }
      logService.info("Lưu data vào key thành công.");
    } catch (error) {
      logService.warn({ error }, "Lỗi khi lưu vào cache.");
    }
  }
}
