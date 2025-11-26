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
    let maxStep: number = 2;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows } = await this.pool.query<Warehouse>(queryConfig);
      logService.info(
        {
          step: `${++step}/${
            !data.packagingIds || data.packagingIds.length === 0
              ? --maxStep
              : maxStep
          }`,
          stepOperation: "db.insert",
          queryConfig: queryConfig,
        },
        `[${step}/${maxStep}] Tạo thông tin nhà kho thành công.`
      );

      if (data.packagingIds && data.packagingIds.length > 0) {
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
            step: `${++step}/${maxStep}`,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `[${step}/${maxStep}] Thêm các bao bì vào nhà kho warehouseId=${rows[0].id} thành công.`
        );
      }
      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);
      return rows[0];
    } catch (error) {
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
