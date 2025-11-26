import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { UserPassword } from "../user.types";
import BaseUserService from "./base.service";

export default class FindByIdService extends BaseUserService {
  async execute(userId: string): Promise<UserPassword | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT *
      FROM
          users 
      WHERE
          id = $1::text
      LIMIT
          1;
      `,
      values: [userId],
    };
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });
    try {
      const { rows } = await this.pool.query<UserPassword>(queryConfig);
      const user = rows[0];
      if (rows[0]) {
        logService.info(`Tìm thấy userId=${userId} trong database`);
        return user;
      }
      logService.info(`Không tìm thấy userId=${userId} trong database`);
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
        `Lỗi khi truy vấn người dùng userId=${userId} trong database.`
      );
      throw new InternalServerError();
    }
  }

  async findByIdCache(userId: string): Promise<UserPassword | null> {
    const logService = this.log.child({
      service: "FindByIdService.findByIdCache",
      source: "cache",
      operation: "redis.get",
      command: "GET user:[id]",
    });
    try {
      const userString = await this.redis.get(`user:${userId}`);
      if (!userString) {
        logService.info(`Truy vấn key='user:${userId}' không tồn tại.`);
        return null;
      }
      logService.info(`Truy vấn key='user:${userId}' thành công.`);
      return JSON.parse(userString) as UserPassword;
    } catch (err) {
      logService.warn({ err }, `Lỗi truy vấn key='user:${userId}'.`);
      return null;
    }
  }
}
