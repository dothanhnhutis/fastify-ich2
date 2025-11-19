import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import type { Warehouse } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class UpdateByIdService extends BaseWarehouseService {
  async updateWarehouseById(
    warehouseId: string,
    data: WarehouseRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;

    let client: PoolClient | null = null;

    let idx = 1;
    const sets: string[] = [];
    const values: (number | string | null | Date)[] = [];

    if (data.name !== undefined) {
      sets.push(`"name" = $${idx++}`);
      values.push(data.name);
    }

    if (data.address !== undefined) {
      sets.push(`"address" = $${idx++}`);
      values.push(data.address);
    }

    if (data.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `deactived_at = $${idx++}::timestamptz`
      );
      values.push(data.status, data.status === "ACTIVE" ? null : new Date());
    }

    values.push(warehouseId);

    let maxStep = 0;
    if (sets.length > 0) maxStep++;
    if (data.packagingIds) {
      maxStep++;
      if (data.packagingIds.length > 0) {
        maxStep++;
      }
    }

    let queryConfig: QueryConfig;

    if (maxStep === 1) {
      const logService = this.log.child({
        service: "UpdateByIdService.execute",
        source: "database",
      });

      try {
        if (sets.length > 0) {
          queryConfig = {
            text: `UPDATE warehouses SET ${sets.join(
              ", "
            )} WHERE id = $${idx} RETURNING *;`,
            values,
          };
          await this.pool.query<Warehouse>(queryConfig);
          logService.info(
            {
              operation: "db.update",
              queryConfig,
            },
            `Cập nhật thông tin nhà kho warehouseId=${warehouseId} thành công.`
          );
        } else {
          queryConfig = {
            text: `DELETE FROM packaging_inventory
            WHERE warehouse_id = $1::text RETURNING *;`,
            values: [warehouseId],
          };
          // xoá hết
          await this.pool.query(queryConfig);
          logService.info(
            {
              operation: "db.delete",
              queryConfig,
            },
            `Xoá hết bao bi trong kho warehouseId=${warehouseId} thành công.`
          );
        }
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
          `Lỗi khi tạo nhà kho mới trong database.`
        );
        throw new InternalServerError();
      }
    } else {
      let step = 1;
      const logService = this.log.child({
        service: "CreateService.execute",
        source: "database",
      });
      try {
        client = await this.pool.connect();
        await client.query("BEGIN");

        if (sets.length > 0) {
          queryConfig = {
            text: `UPDATE warehouses SET ${sets.join(
              ", "
            )} WHERE id = $${idx} RETURNING *;`,
            values,
          };
          await this.pool.query<Warehouse>(queryConfig);
          logService.info(
            {
              step: `${step++}/${maxStep}`,
              stepOperation: "db.insert",
              queryConfig,
            },
            `Cập nhật thông tin nhà kho warehouseId=${warehouseId} thành công.`
          );
        }

        if (data.packagingIds) {
          if (data.packagingIds.length > 0) {
            queryConfig = {
              text: `DELETE FROM packaging_inventory
              WHERE warehouse_id = $1::text 
                AND packaging_id NOT IN (${data.packagingIds
                  .map((_, i) => {
                    return `$${i + 2}::text`;
                  })
                  .join(", ")})
              RETURNING *;`,
              values: [warehouseId, ...data.packagingIds],
            };
            // delete warehouse
            await client.query(queryConfig);
            logService.info(
              {
                step: `${step++}/${maxStep}`,
                stepOperation: "db.insert",
                queryConfig,
              },
              `Xoá bao bì của warehouseId=${warehouseId} không có trong danh sách thành công.`
            );

            queryConfig = {
              text: `INSERT INTO packaging_inventory (warehouse_id,packaging_id)
            VALUES ${data.packagingIds
              .map((_, i) => `($1, $${i + 2})`)
              .join(", ")} 
            ON CONFLICT DO NOTHING;`,
              values: [warehouseId, ...data.packagingIds],
            };
            // insert warehouse
            await client.query(queryConfig);
            logService.info(
              {
                step: `${step++}/${maxStep}`,
                stepOperation: "db.insert",
                queryConfig,
              },
              `Thêm bao bì mới vào nhà kho warehouseId=${warehouseId} thành công.`
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
                step: `${step++}/${maxStep}`,
                stepOperation: "db.delete",
                queryConfig,
              },
              `Xoá hết bao bi trong kho warehouseId=${warehouseId} thành công.`
            );
          }
        }

        await client.query("COMMIT");
        logService.info(
          `Cập nhật nhà kho warehouseId=${warehouseId} thành công.`
        );
      } catch (error) {
        if (client) {
          try {
            await client.query("ROLLBACK");
          } catch (rollbackErr) {
            logService.error({ error: rollbackErr }, "Rollback failed");
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
          `Lỗi khi cập nhật nhà kho warehouseId=${warehouseId} trong database.`
        );
        throw new InternalServerError();
      } finally {
        if (client) {
          client.release();
        }
      }
    }
  }
}
