import type { Role } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseUserService from "./base.service";

export default class DeleteByIdService extends BaseUserService {
  async execute(userId: string): Promise<Role> {
    const queryConfig: QueryConfig = {
      text: `UPDATE users SET deleted_at = $1::timestamptz WHERE id = $2::text RETURNING *;`,
      values: [new Date(), userId],
    };
    const logService = this.log.child({
      service: "DeleteByIdService.execute",
      source: "database",
      operation: "db.delete",
      queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Role>(queryConfig);
      logService.info(`Xoá tài khoản userId=${userId} thành công.`);
      return rows[0];
    } catch (error: unknown) {
      logService.error(
        {
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
        `Lỗi khi xoá tài khoản userId=${userId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
