import type { Role } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseRoleService from "./base.service";

export default class FindByIdService extends BaseRoleService {
  async execute(roleId: string): Promise<Role | null> {
    const queryConfig: QueryConfig = {
      text: `
            SELECT *
            FROM roles
            WHERE id = $1::text
            LIMIT 1;
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
      if (rows[0]) {
        logService.info(`Tìm thấy vai trò roleId=${roleId} trong database`);
        return rows[0];
      }
      logService.info(`Không tìm thấy vai trò roleId=${roleId} trong database`);
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
        `Lỗi khi truy vấn vai trò roleId=${roleId} database.`
      );
      throw new InternalServerError();
    }
  }
}
