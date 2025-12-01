import type { Packaging } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BasePackagingService from "./base.service";

export default class FindByIdService extends BasePackagingService {
  async execute(packagingId: string): Promise<Packaging | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT p.*,
            (
              CASE
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
                        'created_at', to_char(pim.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    )
                )
              END
            ) AS image
      FROM packagings p
          LEFT JOIN packaging_images pim ON pim.packaging_id = p.id
              AND pim.is_primary = TRUE 
              AND pim.deleted_at IS NULL
          LEFT JOIN files f ON f.id = pim.file_id
      WHERE p.deleted_at IS NULL
          AND p.id = $1::text;
      `,
      values: [packagingId],
    };
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.select",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<Packaging>(queryConfig);

      if (rows[0]) {
        logService.info(
          `Tìm thấy bao bì packagingId=${packagingId} trong database`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy bao bì packagingId=${packagingId} trong database`
      );
      return null;
    } catch (error: unknown) {
      logService.error(
        {
          queryConfig,
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
        `Lỗi khi truy vấn bao bì packagingId=${packagingId} trong database.`
      );
      throw new InternalServerError();
    }
  }
}
