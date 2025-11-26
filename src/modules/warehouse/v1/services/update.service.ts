import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class UpdateByIdService extends BaseWarehouseService {
  async execute(
    warehouseId: string,
    data: WarehouseRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;
    const { packagingIds, ...warehouse } = data;

    let idx = 1;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (warehouse.name !== undefined) {
      sets.push(`"name" = $${idx++}`);
      values.push(warehouse.name);
    }

    if (warehouse.address !== undefined) {
      sets.push(`"address" = $${idx++}`);
      values.push(warehouse.address);
    }

    if (warehouse.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `deactived_at = $${idx++}::timestamptz`
      );
      values.push(
        warehouse.status,
        warehouse.status === "ACTIVE" ? null : new Date()
      );
    }

    values.push(warehouseId);

    let queryConfig: QueryConfig = {
      text: `UPDATE roles SET ${sets.join(
        ", "
      )} WHERE id = $${idx} RETURNING *;`,
      values,
    };

    const logService = this.log.child({
      service: "UpdateByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let client: PoolClient | null = null;
    let step: number = 0;
    let maxStep: number = 0;

    if (sets.length > 0) maxStep++;
    if (packagingIds) {
      maxStep++;
      if (packagingIds.length > 0) maxStep++;
    }

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      if (sets.length > 0) {
        await this.pool.query<Warehouse>(queryConfig);
        logService.info(
          {
            step: `${++step}/${maxStep}`,
            stepOperation: "db.update",
            queryConfig,
          },
          `[${step}/${maxStep}] Cập nhật thông tin nhà kho warehouseId=${warehouseId} thành công.`
        );
      }

      if (packagingIds) {
        if (packagingIds.length > 0) {
          queryConfig = {
            text: `
                DELETE FROM packaging_inventory
                WHERE warehouse_id = $1::text 
                  AND packaging_id NOT IN (${packagingIds
                    .map((_, i) => {
                      return `$${i + 2}::text`;
                    })
                    .join(", ")})
                RETURNING *;
              `,
            values: [warehouseId, ...packagingIds],
          };
          // delete warehouse
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.insert",
              queryConfig,
            },
            `[${step}/${maxStep}] Xoá bao bì của warehouseId=${warehouseId} không có trong danh sách thành công.`
          );

          queryConfig = {
            text: `INSERT INTO packaging_inventory (warehouse_id,packaging_id)
            VALUES ${packagingIds.map((_, i) => `($1, $${i + 2})`).join(", ")} 
            ON CONFLICT DO NOTHING;`,
            values: [warehouseId, ...packagingIds],
          };
          // insert warehouse
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.insert",
              queryConfig,
            },
            `[${step}/${maxStep}] Thêm bao bì mới vào nhà kho warehouseId=${warehouseId} thành công.`
          );
        } else {
          queryConfig = {
            text: `DELETE FROM packaging_inventory
              WHERE warehouse_id = $1::text RETURNING *;`,
            values: [warehouseId],
          };
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.delete",
              queryConfig,
            },
            `[${step}/${maxStep}] Xoá hết bao bi trong kho warehouseId=${warehouseId} thành công.`
          );
        }
      }

      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);
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
        `[${step}/${maxStep}] Lỗi khi cập nhật nhà kho warehouseId=${warehouseId} trong database.`
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
