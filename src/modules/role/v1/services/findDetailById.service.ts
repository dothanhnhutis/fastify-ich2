import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { RoleDetail } from "../role.types";
import BaseRoleService from "./base.service";

export default class FindDetailByIdService extends BaseRoleService {
  async execute(roleId: string): Promise<RoleDetail | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT r.*,
            COUNT(u.id)::int AS user_count,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', u.id,
                        'email', u.email,
                        'username', u.username,
                        'has_password', (u.password_hash IS NOT NULL)::boolean,
                        'status', u.status,
                        'deactivated_at', u.deactivated_at,
                        'created_at', u.created_at,
                        'updated_at', u.updated_at,
                        'avatar', CASE WHEN ua.file_id IS NOT NULL 
                            THEN 
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
                    )
                ) FILTER ( WHERE u.id IS NOT NULL ), '[]'
            ) AS users
      FROM roles r
              LEFT JOIN user_roles ur ON ur.role_id = r.id
              LEFT JOIN users u ON u.id = ur.user_id AND u.status = 'ACTIVE' AND u.deactivated_at IS NULL
              LEFT JOIN user_avatars ua ON ua.user_id = u.id AND ua.is_primary = TRUE AND ua.deactivated_at IS NULL
              LEFT JOIN files f ON f.id = ua.file_id
      WHERE r.deactivated_at IS NULL AND r.id = $1::text
      GROUP BY r.id
      LIMIT 1;
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
