import type { Role } from "@modules/shared/role/role.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseRoleService from "./base.service";

export default class FindByIdService extends BaseRoleService {
  async execute(roleId: string): Promise<Role | null> {
    const queryConfig: QueryConfig = {
      text: `
            SELECT
                r.*,
                COUNT(ur.user_id) FILTER (
                    WHERE
                        ur.user_id IS NOT NULL
                        AND u.status = 'ACTIVE'
                        AND u.deactived_at IS NULL
                )::int AS user_count
            FROM
                roles r
                LEFT JOIN user_roles ur ON (ur.role_id = r.id)
                LEFT JOIN users u ON (ur.user_id = u.id)
            WHERE
                r.id = $1
            GROUP BY
                r.id
            LIMIT
                1;
          `,
      values: [roleId],
    };

    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<Role>(queryConfig);
      const role = rows[0];
      if (!role) {
        logService.info(
          `Không tìm thấy vai trò roleId=${roleId} trong database`
        );
        return null;
      }
      logService.info(`Tìm thấy vai trò roleId=${roleId} trong database`);

      return role;
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
        `Lỗi khi truy vấn vai trò roleId=${roleId} database.`
      );
      throw new InternalServerError();
    }
  }
}
