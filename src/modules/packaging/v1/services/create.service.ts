import type { Packaging } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { PackagingRequestType } from "../packaging.types";
import BasePackagingService from "./base.service";

export default class CreateService extends BasePackagingService {
  async execute(
    data: PackagingRequestType["Create"]["Body"]
  ): Promise<Packaging> {
    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
      operation: "db.transaction",
    });

    const columns: string[] = ["name", "unit"];
    const values: unknown[] = [data.name, data.unit];
    const placeholders: string[] = ["$1::text", "$2::text"];
    let idx = values.length;

    if (data.unit === "CARTON") {
      columns.push("pcs_ctn");
      values.push(data.pcs_ctn);
      placeholders.push(`$${++idx}::int`);
    }

    if (data.min_stock_level !== undefined) {
      columns.push("min_stock_level");
      values.push(data.min_stock_level);
      placeholders.push(`$${++idx}::int`);
    }

    let queryConfig: QueryConfig = {
      text: `INSERT INTO packagings (${columns.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) RETURNING *;`,
      values,
    };

    let client: PoolClient | null = null;
    let step: number = 0;
    let maxStep: number = 3;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows } = await client.query<Packaging>(queryConfig);

      logService.info(
        {
          step: `${++step}/${
            !data.warehouseIds || data.warehouseIds.length === 0
              ? --maxStep
              : maxStep
          }`,
          stepOperation: "db.insert",
          queryConfig: queryConfig,
        },
        `[${step}/${maxStep}] Tạo thông tin bao bì thành công.`
      );

      if (data.warehouseIds && data.warehouseIds.length > 0) {
        const values: string[] = [rows[0].id];
        const placeholders = data.warehouseIds
          .map((id, i) => {
            values.push(id);
            return `($${i + 2}::text, $1::text)`;
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
          `[${step}/${maxStep}] Các nhà kho đã thêm bao bì packagingId=${rows[0].id} thành công.`
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
        `[${step}/${maxStep}] Lỗi khi tạo bao bì mới trong database.`
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
