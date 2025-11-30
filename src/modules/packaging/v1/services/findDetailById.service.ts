import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { PackagingDetail } from "../packaging.types";
import BasePackagingService from "./base.service";

export default class FindDetailByIdService extends BasePackagingService {
  async execute(packagingId: string): Promise<PackagingDetail | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT p.*,
            SUM(pi.quantity)::int AS total_quantity,
            COUNT(w.id IS NOT NULL)::int AS warehouse_count,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', w.id,
                        'name', w.name,
                        'address', w.address,
                        'status', w.status,
                        'disabled_at', w.disabled_at,
                        'deleted_at', w.deleted_at,
                        'created_ad', w.created_at,
                        'updated_at', w.updated_at,
                        'quantity', pi.quantity
                    )
                ) FILTER ( WHERE w.id IS NOT NULL ), '[]'
            ) AS warehouses
      FROM packagings p
              LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
              LEFT JOIN files f ON f.id = pim.file_id
              LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
              LEFT JOIN warehouses w ON w.id = pi.warehouse_id
      WHERE p.deleted_at IS NULL
        AND p.id = $1::text
      GROUP BY p.id;
      `,
      values: [packagingId],
    };
    const logService = this.log.child({
      service: "FindDetailByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<PackagingDetail>(queryConfig);
      if (rows[0]) {
        logService.info(
          `Tìm thấy thông tin chi tiết bao bì packagingId=${packagingId} trong database.`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy thông tin chi tiết nhà kho packagingId=${packagingId} trong database.`
      );
      return null;
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
        `Lỗi khi truy vấn thông tin chi tiết bao bì packagingId=${packagingId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
