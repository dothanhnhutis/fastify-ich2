import type { Packaging } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BasePackagingService from "./base.service";

export default class FindByIdService extends BasePackagingService {
  async execute(packagingId: string): Promise<Packaging | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT *
      FROM packagings p
      WHERE p.deleted_at IS NULL
        AND id = $1::text;
      `,
      values: [packagingId],
    };
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.query",
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
