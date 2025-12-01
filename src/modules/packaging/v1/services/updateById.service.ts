import type { Packaging } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { PackagingRequestType } from "../packaging.types";
import BasePackagingService from "./base.service";

export default class UpdateByIdService extends BasePackagingService {
  async execute(
    packagingId: string,
    data: PackagingRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;

    let idx = 1;
    const sets: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}::text`);
      values.push(data.name);
    }

    if (data.unit !== undefined) {
      sets.push(`unit = $${idx++}::text`);
      values.push(data.unit);
    }

    if (data.pcs_ctn !== undefined) {
      sets.push(`pcs_ctn = $${idx++}::int`);
      values.push(data.pcs_ctn);
    }

    if (data.min_stock_level !== undefined) {
      sets.push(`min_stock_level = $${idx++}::integer`);
      values.push(data.min_stock_level);
    }

    if (data.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `disabled_at = $${idx++}::timestamptz`
      );
      values.push(data.status, data.status === "ACTIVE" ? null : new Date());
    }

    if (sets.length === 0) return;
    values.push(packagingId);

    const queryConfig: QueryConfig = {
      text: `UPDATE packagings SET ${sets.join(
        ", "
      )} WHERE id = $${idx} RETURNING *;`,
      values,
    };

    const logService = this.log.child({
      service: "UpdateByIdService.execute",
      source: "database",
      operation: "db.update",
      queryConfig,
    });

    try {
      await this.pool.query<Packaging>(queryConfig);
      logService.info(
        `Cập nhật thông tin bao bì packagingId=${packagingId} thành công.`
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
        `Lỗi khi cập nhật bao bì packagingId=${packagingId} trong database.`
      );

      throw new InternalServerError();
    }
  }
}
