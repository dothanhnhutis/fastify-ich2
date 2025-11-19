import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseUserService from "./base.service";

export default class UpdateAvatarByIdService extends BaseUserService {
  async execute(userId: string): Promise<void> {
    const queryConfig: QueryConfig = {
      text: `
              UPDATE user_avatars
              SET deleted_at = $1::timestamptz(3), is_primary = false
              WHERE user_id = $2::text AND is_primary = true
            `,
      values: [new Date(), userId],
    };
    const logService = this.log.child({
      service: "UpdateAvatarByIdService.execute",
      source: "database",
      operation: "db.update",
      queryConfig,
    });
    try {
      await this.pool.query(queryConfig);
      logService.info(`Xoá ảnh đại diện userId=${userId} thành công.`);
      // this.invalidateCache(userId);
    } catch (error: unknown) {
      this.log.error(
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
        `Xoá ảnh đại diện userId=${userId} thất bại.`
      );
      throw new InternalServerError();
    }
  }
}
