import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { RoleDetail } from "../role.types";
import BaseRoleService from "./base.service";

export default class FindDetailByIdService extends BaseRoleService {
  async execute(roleId: string) {
    const queryConfig: QueryConfig = {
      text: `
            SELECT
                r.*,
                COUNT(ur.user_id) FILTER (
                    WHERE
                        ur.user_id IS NOT NULL
                        AND u.status = 'ACTIVE'
                        AND u.deactived_at IS NULL
                )::int AS user_count,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id',
                            u.id,
                            'email',
                            u.email,
                            'has_password',
                            (u.password_hash IS NOT NULL)::boolean,
                            'username',
                            u.username,
                            'status',
                            u.status,
                            'deactived_at',
                            u.deactived_at,
                            'created_at',
                            to_char(
                                u.created_at AT TIME ZONE 'UTC',
                                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                            ),
                            'updated_at',
                            to_char(
                                u.updated_at AT TIME ZONE 'UTC',
                                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                            )
                        )
                    ) FILTER (
                        WHERE
                            u.id IS NOT NULL
                             
                    ),
                    '[]'
                ) AS users
            FROM
                roles r
                LEFT JOIN user_roles ur ON (ur.role_id = r.id)
                LEFT JOIN users u ON (ur.user_id = u.id)
            WHERE
                r.id = $1
            GROUP BY
                r.id;
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
