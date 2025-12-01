import type { Role } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseRoleService from "./base.service";

export default class DeleteByIdService extends BaseRoleService {
  async execute(roleId: string): Promise<Role> {
    const queryConfig: QueryConfig = {
      text: `UPDATE roles SET deleted_at = $1::timestamptz WHERE id = $2::text RETURNING *;`,
      values: [new Date(), roleId],
    };
    const logService = this.log.child({
      service: "DeleteByIdService.execute",
      source: "database",
      operation: "db.update",
      queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Role>(queryConfig);
      logService.info(`Xoá vai trò roleId=${roleId} thành công.`);
      return rows[0];
    } catch (error: unknown) {
      logService.error(
        {
          queryConfig,
          error,
          // err: isPostgresError(err) ? err : String(err),
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
        `Lỗi khi xoá vai trò roleId=${roleId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
