import type { Metadata } from "@modules/shared/types";
import type { UserWithoutPassword } from "@modules/shared/user/user.shared.types";
import env from "@shared/config/env";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy, makeQueryCacheKey } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { UserRequestType } from "../user.schema";
import BaseUserService from "./base.service";

const sortFieldMap: Record<string, string> = {
  username: "u.username",
  email: "u.email",
  status: "u.status",
  deactived_at: "u.deactived_at",
  created_at: "u.created_at",
  updated_at: "u.updated_at",
};

export default class FindManyService extends BaseUserService {
  async execute(
    query: UserRequestType["Query"]["Querystring"]
  ): Promise<{ users: UserWithoutPassword[]; metadata: Metadata }> {
    const baseSelect = `
        SELECT
            u.id,
            u.email,
            (u.password_hash IS NOT NULL)::boolean AS has_password,
            u.username,
            u.status,
            u.deactived_at,
            u.created_at,
            u.updated_at,
            COUNT(r.id) FILTER (
                WHERE
                    r.id IS NOT NULL
                    AND r.status = 'ACTIVE'
            )::int AS role_count,
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
            END 
            AS avatar
        FROM
            users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN user_avatars av ON av.user_id = u.id
            AND av.deleted_at IS NULL
            AND av.is_primary = true
            LEFT JOIN files f ON f.id = av.file_id
            AND av.deleted_at IS NULL
        
        `;
    const values: unknown[] = [];
    const where: string[] = [];
    let idx = 1;

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

    const groupByClause = `GROUP BY u.id, u.email, u.password_hash, u.username, u.status,
            u.deactived_at, u.created_at, u.updated_at, av.file_id, av.width, av.height,
            av.is_primary, av.created_at, f.original_name, f.mime_type, f.destination,
            f.file_name, f.size`;

    const logService = this.log.child({
      service: "FindManyService.execute",
      source: "database",
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
    let result: { users: UserWithoutPassword[]; metadata: Metadata } = {
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

        const { rows: users } = await client.query<UserWithoutPassword>(
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

  async findManyCache(
    query: UserRequestType["Query"]["Querystring"]
  ): Promise<{ users: UserWithoutPassword[]; metadata: Metadata } | null> {
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
        users: UserWithoutPassword[];
        metadata: Metadata;
      };
    } catch (error) {
      logService.warn({ error }, `Lỗi truy key='${userQueryKey}'`);
      return null;
    }
  }

  async saveManyToCache(
    query: UserRequestType["Query"]["Querystring"],
    data: { users: UserWithoutPassword[]; metadata: Metadata }
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
