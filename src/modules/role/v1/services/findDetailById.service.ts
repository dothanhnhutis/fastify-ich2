import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { RoleDetail } from "../role.types";
import BaseRoleService from "./base.service";

export default class FindDetailByIdService extends BaseRoleService {
  async execute(roleId: string): Promise<RoleDetail | null> {
    const queryConfig: QueryConfig = {
      text: `
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
      WHERE
          r.id = $1::text
      GROUP BY r.id;
          `,
      values: [roleId],
    };

    const logService = this.log.child({
      service: "FindDetailByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<RoleDetail>(queryConfig);
      if (rows[0]) {
        logService.info(
          `Tìm thấy thông tin chi tiết vai trò roleId=${roleId} trong database.`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy thông tin chi tiết vai trò roleId=${roleId} trong database.`
      );
      return null;
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
        `Lỗi khi truy vấn thông tin chi tiết vai trò roleId=${roleId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
