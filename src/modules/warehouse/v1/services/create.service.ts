import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import type { Warehouse } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class CreateService extends BaseWarehouseService {
  async execute(
    data: WarehouseRequestType["Create"]["Body"]
  ): Promise<Warehouse> {
    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: `INSERT INTO warehouses (name, address) VALUES ($1::text, $2::text) RETURNING *;`,
      values: [data.name, data.address],
    };
    let client: PoolClient | null = null;
    let step: number = 1;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows } = await this.pool.query<Warehouse>(queryConfig);
      logService.info(
        {
          step: step++,
          stepOperation: "db.insert",
          queryConfig: queryConfig,
        },
        `Tạo thông tin nhà kho thành công.`
      );

      if (data.packagingIds && data.packagingIds.length > 0) {
        const { rows } = await client.query<Warehouse>(queryConfig);
        logService.info(
          {
            step: step++,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `Tạo thông tin nhà kho thành công.`
        );

        const values: string[] = [];
        const placeholders = data.packagingIds
          .map((id, i) => {
            const baseIndex = i * 2;
            values.push(rows[0].id, id);
            return `($${baseIndex + 1}, $${baseIndex + 2})`;
          })
          .join(", ");

        queryConfig = {
          text: `INSERT INTO packaging_inventory (warehouse_id, packaging_id) VALUES ${placeholders};`,
          values,
        };

        await client.query(queryConfig);
        logService.info(
          {
            step: step++,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `Thêm các bao bì vào nhà kho warehouseId=${rows[0].id} thành công.`
        );
      }
      await client.query("COMMIT");
      logService.info("Tạo nhà kho mới thành công.");
      return rows[0];
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackErr) {
          logService.error({ error: rollbackErr }, "Rollback thất bại.");
        }
      }
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
        `Lỗi khi tạo nhà kho mới trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
