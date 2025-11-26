import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseWarehouseService from "./base.service";

export default class DeleteByIdService extends BaseWarehouseService {
  async execute(warehouseId: string): Promise<Warehouse> {
    const queryConfig: QueryConfig = {
      text: `DELETE FROM warehouses WHERE id = $1 RETURNING *;`,
      values: [warehouseId],
    };
    const logService = this.log.child({
      service: "DeleteByIdService.execute",
      source: "database",
      operation: "db.delete",
      queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Warehouse>(queryConfig);
      logService.info(`Xoá nhà kho warehouseId=${warehouseId} thành công.`);
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
        `Lỗi khi xoá nhà kho warehouseId=${warehouseId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
