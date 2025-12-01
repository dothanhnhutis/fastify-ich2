import type { UserWithoutPassword } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseUserService from "./base.service";

export default class FindWithoutPasswordByEmailService extends BaseUserService {
  async execute(email: string): Promise<UserWithoutPassword | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT u.id,
            u.username,
            u.email,
            (u.password_hash IS NOT NULL)::boolean as has_password,
            u.status,
            u.disabled_at,
            u.deleted_at,
            u.created_at,
            u.updated_at,
            (CASE
                  WHEN ua.file_id IS NOT NULL THEN
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
                      ) END
                ) AS avatar
      FROM users u
              LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deleted_at IS NULL
              LEFT JOIN files f ON f.id = ua.file_id
      WHERE u.email = $1::text
        AND u.deleted_at IS NULL
      GROUP BY u.id, u.username, u.email, u.password_hash, u.status, u.disabled_at, u.deleted_at, u.created_at, u.updated_at,
              ua.file_id, ua.height, ua.width, ua.is_primary, f.original_name, f.mime_type, f.destination, f.file_name, f.size,
              ua.created_at
      LIMIT 1;
      `,
      values: [email],
    };

    const logService = this.log.child({
      service: "FindWithoutPasswordByEmailService.execute",
      source: "database",
      operation: "db.select",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<UserWithoutPassword>(queryConfig);
      if (rows[0]) {
        logService.info(`Tìm thấy email=${email} trong database`);
        return rows[0];
      }
      logService.info(`Không tìm thấy email=${email} trong database`);
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
        `Lỗi khi truy vấn email=${email} database.`
      );
      throw new InternalServerError();
    }
  }
}
