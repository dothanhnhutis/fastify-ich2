import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { Warehouse } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class FindByIdService extends BaseWarehouseService {
  async execute(warehouseId: string): Promise<Warehouse | null> {
    const queryConfig: QueryConfig = {
      text: `SELECT
                w.*,
                COUNT(pi.packaging_id) FILTER (
                    WHERE
                        pi.packaging_id IS NOT NULL
                        AND p.status = 'ACTIVE'
                )::int AS packaging_count
            FROM
                warehouses w
                LEFT JOIN packaging_inventory pi ON (pi.warehouse_id = w.id)
                LEFT JOIN packagings p ON (pi.packaging_id = p.id)
            WHERE
                w.id = $1
            GROUP BY
                w.id;`,
      values: [warehouseId],
    };
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Warehouse>(queryConfig);

      if (!rows[0]) {
        logService.info(
          `Không tìm thấy nhà kho warehouseId=${warehouseId} trong database`
        );
        return null;
      }
      logService.info(
        `Tìm thấy nhà kho warehouseId=${warehouseId} trong database`
      );
      // await this.saveToCache(user);
      return rows[0];
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
        `Lỗi khi truy vấn nhà kho warehouseId=${warehouseId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
