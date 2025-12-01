import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BasePackagingService from "./base.service";

export default class DeleteByIdService extends BasePackagingService {
  async execute(packagingId: string): Promise<Warehouse> {
    const queryConfig: QueryConfig = {
      text: `UPDATE packagings SET deleted_at = $1::timestamptz WHERE id = $2 RETURNING *;`,
      values: [new Date(), packagingId],
    };
    const logService = this.log.child({
      service: "DeleteByIdService.execute",
      source: "database",
      operation: "db.update",
      queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Warehouse>(queryConfig);
      logService.info(`Xoá bao bì packagingId=${packagingId} thành công.`);
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
        `Lỗi khi xoá bao bì packagingId=${packagingId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
