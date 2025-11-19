import type { Role } from "@modules/shared/role/role.shared.types";
import type { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { isDateString } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

export default class FindManyService extends BaseRoleService {
  async execute(query: RoleRequestType["Query"]["Querystring"]): Promise<{
    roles: Role[];
    metadata: Metadata;
  }> {
    const queryString = [
      `
      SELECT
          r.*,
          (
              SELECT COUNT(*)
              FROM user_roles ur2
              JOIN users u2 ON u2.id = ur2.user_id
              WHERE ur2.role_id = r.id
                AND u2.status = 'ACTIVE'
                AND u2.deactived_at IS NULL
          )::int AS user_count,
          COALESCE(
              json_agg(
                  json_build_object(
                      'id', u.id,
                      'email', u.email,
                      'has_password', (u.password_hash IS NOT NULL)::boolean,
                      'username', u.username,
                      'status', u.status,
                      'deactived_at', u.deactived_at,
                      'created_at', to_char(
                          u.created_at AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                      ),
                      'updated_at', to_char(
                          u.updated_at AT TIME ZONE 'UTC',
                          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                      ),
                      'avatar', av.avatar
                  )
              ) FILTER (WHERE u.id IS NOT NULL),
              '[]'
          ) AS users
      FROM roles r
      LEFT JOIN LATERAL (
          SELECT u.*
          FROM user_roles ur
          JOIN users u ON u.id = ur.user_id
          WHERE ur.role_id = r.id
            AND u.status = 'ACTIVE'
            AND u.deactived_at IS NULL
          ORDER BY u.created_at DESC
          LIMIT 3
      ) u ON TRUE
      LEFT JOIN LATERAL (
          SELECT json_build_object(
              'id', av.file_id,
              'width', av.width,
              'height', av.height,
              'is_primary', av.is_primary,
              'original_name', f.original_name,
              'mime_type', f.mime_type,
              'destination', f.destination,
              'file_name', f.file_name,
              'size', f.size,
              'created_at', to_char(
                  av.created_at AT TIME ZONE 'UTC',
                  'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
              )
          ) AS avatar
          FROM user_avatars av
          JOIN files f ON f.id = av.file_id
          WHERE av.user_id = u.id
            AND av.deleted_at IS NULL
            AND av.is_primary = TRUE
          LIMIT 1
      ) av ON TRUE
    `,
    ];

    const values: unknown[] = [];
    const where: string[] = [];
    let idx = 1;

    if (query.name !== undefined) {
      where.push(`r.name ILIKE $${idx++}::text`);
      values.push(`%${query.name.trim()}%`);
    }

    if (query.id !== undefined) {
      where.push(`r.id = ANY($${idx++}::text[])`);
      values.push(query.id);
    }

    if (query.permission !== undefined) {
      where.push(`r.permissions @> $${idx++}::text[]`);
      values.push(query.permission);
    }

    if (query.status !== undefined) {
      where.push(`r.status = $${idx++}::text`);
      values.push(`${query.status}`);
    }

    if (query.description !== undefined) {
      where.push(`r.description ILIKE $${idx++}::text`);
      values.push(`%${query.description.trim()}%`);
    }

    if (query.created_from) {
      where.push(`r.created_at >= $${idx++}::timestamptz`);
      values.push(
        `${
          isDateString(query.created_from.trim())
            ? `${query.created_from.trim()}T00:00:00.000Z`
            : query.created_from.trim()
        }`
      );
    }

    if (query.created_to) {
      where.push(`r.created_at <= $${idx++}::timestamptz`);
      values.push(
        `${
          isDateString(query.created_to.trim())
            ? `${query.created_to.trim()}T23:59:59.999Z`
            : query.created_to.trim()
        }`
      );
    }

    if (where.length > 0) {
      queryString.push(`WHERE ${where.join(" AND ")}`);
    }

    queryString.push(`GROUP BY r.id`);

    const logService = this.log.child({
      service: "FindManyService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: `WITH roles AS (${queryString.join(
        " "
      )}) SELECT COUNT(*) FROM roles`,
      values,
    };

    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows } = await this.pool.query<{ count: string }>(queryConfig);

      logService.info(
        {
          step: "1/2",
          stepOperation: "db.select",
          queryConfig,
        },
        `Có ${rows[0].count} kết quả.`
      );

      const totalItem = parseInt(rows[0].count, 10);

      if (query.sort !== undefined) {
        queryString.push(
          `ORDER BY ${query.sort
            .map((sort) => {
              const [field, direction] = sort.split(".");
              return `${field} ${direction.toUpperCase()}`;
            })
            .join(", ")}`
        );
      }

      const limit = query.limit ?? totalItem;
      const page = query.page ?? 1;
      const offset = (page - 1) * limit;

      queryString.push(`LIMIT $${idx++}::int OFFSET $${idx}::int`);
      values.push(limit, offset);

      queryConfig = {
        text: queryString.join(" "),
        values,
      };

      const { rows: roles } = await this.pool.query<Role>(queryConfig);
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

      return {
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
        `Lỗi khi truy vấn trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
