import type { Packaging } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { PackagingRequestType } from "../packaging.types";
import BasePackagingService from "./base.service";

export default class UpdateByIdService extends BasePackagingService {
  async execute(
    packagingId: string,
    data: PackagingRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;
    const { warehouseIds, ...packaging } = data;

    let idx = 1;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (packaging.name !== undefined) {
      sets.push(`name = $${idx++}::text`);
      values.push(packaging.name);
    }

    if (packaging.unit !== undefined) {
      sets.push(`unit = $${idx++}::text`);
      values.push(packaging.unit);
    }

    if (packaging.pcs_ctn !== undefined) {
      sets.push(`pcs_ctn = $${idx++}::integer`);
      values.push(packaging.pcs_ctn);
    }

    if (packaging.min_stock_level !== undefined) {
      sets.push(`min_stock_level = $${idx++}::integer`);
      values.push(packaging.min_stock_level);
    }

    if (packaging.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `disabled_at = $${idx++}::timestamptz`
      );
      values.push(
        packaging.status,
        packaging.status === "ACTIVE" ? null : new Date()
      );
    }
    values.push(packagingId);

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
    if (warehouseIds) {
      maxStep++;
      if (warehouseIds.length > 0) maxStep++;
    }

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      if (sets.length > 0) {
        await this.pool.query<Packaging>(queryConfig);
        logService.info(
          {
            step: `${++step}/${maxStep}`,
            stepOperation: "db.update",
            queryConfig,
          },
          `[${step}/${maxStep}] Cập nhật thông tin bao bì packagingId=${packagingId} thành công.`
        );
      }

      if (warehouseIds) {
        if (warehouseIds.length > 0) {
          queryConfig = {
            text: `
                        DELETE FROM packaging_inventory
                        WHERE packaging_id = $1::text 
                          AND warehouse_id NOT IN (${warehouseIds
                            .map((_, i) => {
                              return `$${i + 2}::text`;
                            })
                            .join(", ")})
                        RETURNING *;
                      `,
            values: [packagingId, ...warehouseIds],
          };
          // delete warehouse
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.insert",
              queryConfig,
            },
            `[${step}/${maxStep}] ----- Xoá nhà kho của packagingId=${packagingId} không có trong danh sách thành công.`
          );

          queryConfig = {
            text: `INSERT INTO packaging_inventory (packaging_id, warehouse_id)
                    VALUES ${warehouseIds
                      .map((_, i) => `($1, $${i + 2})`)
                      .join(", ")} 
                    ON CONFLICT DO NOTHING;`,
            values: [packagingId, ...warehouseIds],
          };
          // insert warehouse
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.insert",
              queryConfig,
            },
            `[${step}/${maxStep}] ----Thêm nhà kho mới vào nhà kho packagingId=${packagingId} thành công.`
          );
        } else {
          queryConfig = {
            text: `DELETE FROM packaging_inventory
                      WHERE packaging_id = $1::text RETURNING *;`,
            values: [packagingId],
          };
          await client.query(queryConfig);
          logService.info(
            {
              step: `${++step}/${maxStep}`,
              stepOperation: "db.delete",
              queryConfig,
            },
            `[${step}/${maxStep}]----- Xoá hết bao bi trong kho packagingId=${packagingId} thành công.`
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
        `[${step}/${maxStep}] Lỗi khi cập nhật bao bì packagingId=${packagingId} trong database.`
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
