import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseWarehouseService from "./base.service";

export default class FindByIdService extends BaseWarehouseService {
  async execute(warehouseId: string): Promise<Warehouse | null> {
    const queryConfig: QueryConfig = {
      text: `
        SELECT *
        FROM warehouses
        WHERE deleted_at IS NULL
          AND id = $1::text;
      `,
      values: [warehouseId],
    };
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.select",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Warehouse>(queryConfig);

      if (rows[0]) {
        logService.info(
          `Tìm thấy nhà kho warehouseId=${warehouseId} trong database`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy nhà kho warehouseId=${warehouseId} trong database`
      );
      return null;
    } catch (error: unknown) {
      logService.error(
        {
          queryConfig,
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
        `Lỗi khi truy vấn nhà kho warehouseId=${warehouseId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
