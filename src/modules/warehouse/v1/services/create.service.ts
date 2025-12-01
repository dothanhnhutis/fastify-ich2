import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.types";
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
    let step: number = 0;
    const maxStep: number = 3;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows: warehouses } = await client.query<Warehouse>(queryConfig);

      const selectPackagingText: string =
        "SELECT id FROM packagings WHERE deleted_at IS NULL;";

      const { rows: packagingIds } = await client.query<{ id: string }>({
        text: selectPackagingText,
      });

      logService.info(
        {
          step: `${++step}/${packagingIds.length === 0 ? 1 : maxStep}`,
          stepOperation: "db.insert",
          queryConfig: queryConfig,
        },
        `[${step}/${maxStep}] Tạo thông tin nhà kho thành công.`
      );

      if (packagingIds.length > 0) {
        logService.info(
          {
            step: `${++step}/${maxStep}`,
            stepOperation: "db.select",
            queryConfig: {
              text: selectPackagingText,
            },
          },
          `[${step}/${maxStep}] Lấy danh sách bao bì.`
        );

        const values: string[] = [warehouses[0].id];
        const placeholders = packagingIds
          .map(({ id }, i) => {
            values.push(id);
            return `($1::text, $${i + 2}::text)`;
          })
          .join(", ");

        queryConfig = {
          text: `INSERT INTO packaging_inventory (warehouse_id, packaging_id) VALUES ${placeholders};`,
          values,
        };

        await client.query(queryConfig);
        logService.info(
          {
            step: `${++step}/${maxStep}`,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `[${step}/${maxStep}] Thêm tất cả bao bì vào nhà kho warehouseId=${warehouses[0].id} thành công.`
        );
      }

      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);
      return warehouses[0];
    } catch (error) {
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
        `[${step}/${maxStep}] Lỗi khi tạo nhà kho mới trong database.`
      );
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info(`[${step}/${maxStep}] Rollback thành công.`);
        } catch (rollbackErr) {
          logService.error(
            { error: rollbackErr },
            `[${step}/${maxStep}] Rollback thất bại.`
          );
        }
      }
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
