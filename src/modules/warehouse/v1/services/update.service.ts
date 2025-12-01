import type { Warehouse } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class UpdateByIdService extends BaseWarehouseService {
  async execute(
    warehouseId: string,
    data: WarehouseRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;

    let idx = 1;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      sets.push(`"name" = $${idx++}::varchar`);
      values.push(data.name);
    }

    if (data.address !== undefined) {
      sets.push(`"address" = $${idx++}::text`);
      values.push(data.address);
    }

    if (data.status !== undefined) {
      sets.push(
        `status = $${idx++}::varchar`,
        `disabled_at = $${idx++}::timestamptz`
      );
      values.push(data.status, data.status === "ACTIVE" ? null : new Date());
    }
    if (sets.length === 0) return;

    values.push(warehouseId);

    const queryConfig: QueryConfig = {
      text: `UPDATE warehouses SET ${sets.join(
        ", "
      )} WHERE id = $${idx}::text RETURNING *;`,
      values,
    };

    const logService = this.log.child({
      service: "UpdateByIdService.execute",
      source: "database",
      operation: "db.update",
      queryConfig,
    });

    try {
      await this.pool.query<Warehouse>(queryConfig);
      logService.info(
        `Cập nhật thông tin nhà kho warehouseId=${warehouseId} thành công.`
      );
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
        `Lỗi khi cập nhật nhà kho warehouseId=${warehouseId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
