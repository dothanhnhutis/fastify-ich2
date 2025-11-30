import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { WarehouseDetail } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class FindDetailByIdService extends BaseWarehouseService {
  async execute(warehouseId: string): Promise<WarehouseDetail | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT w.*,
            COUNT(p.id)::int as packaging_count,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', p.id,
                        'name', p.name,
                        'min_stock_level', p.min_stock_level,
                        'unit', p.unit,
                        'pcs_ctn', p.pcs_ctn,
                        'status', p.status,
                        'disabled_at',
                        to_char(p.disabled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                        'deleted_at',
                        to_char(p.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                        'created_at', to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                        'updated_at', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                        'image', CASE
                                      WHEN pim.file_id IS NOT NULL THEN
                                          json_build_object(
                                              'id', pim.file_id,
                                              'width', pim.width,
                                              'height', pim.height,
                                              'is_primary', pim.is_primary,
                                              'original_name', f.original_name,
                                              'mime_type', f.mime_type,
                                              'destination', f.destination,
                                              'file_name', f.file_name,
                                              'size', f.size,
                                              'created_at', to_char(pim.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                                          )
                                  END,
                        'quantity', pi.quantity
                    )
                ) FILTER ( WHERE p.id IS NOT NULL ), '[]'
            ) AS packagings
      FROM warehouses w
              LEFT JOIN packaging_inventory pi ON pi.warehouse_id = w.id
              LEFT JOIN packagings p ON p.id = pi.packaging_id AND p.deleted_at IS NULL
              LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND p.deleted_at IS NULL
              LEFT JOIN files f ON f.id = pim.file_id
      WHERE w.deleted_at IS NULL
        AND w.id = $1::text
      GROUP BY w.id;
      `,
      values: [warehouseId],
    };
    const logService = this.log.child({
      service: "FindDetailByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<WarehouseDetail>(queryConfig);
      if (rows[0]) {
        logService.info(
          `Tìm thấy thông tin chi tiết nhà kho warehouseId=${warehouseId} trong database.`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy thông tin chi tiết nhà kho warehouseId=${warehouseId} trong database.`
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
        `Lỗi khi truy vấn thông tin chi tiết nhà kho warehouseId=${warehouseId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
