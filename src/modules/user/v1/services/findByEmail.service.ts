import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { UserPassword } from "../user.types";
import BaseUserService from "./base.service";

export default class FindByEmailService extends BaseUserService {
  async execute(email: string): Promise<UserPassword | null> {
    const queryConfig: QueryConfig = {
      text: `
      SELECT *
      FROM
          users
      WHERE
          email = $1::text
      LIMIT
          1;
      `,
      values: [email],
    };

    const logService = this.log.child({
      service: "FindByEmailService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<UserPassword>(queryConfig);
      if (rows[0]) {
        logService.info(`Tìm thấy email=${email} trong database`);
        return rows[0];
      }
      logService.info(`Không tìm thấy email=${email} trong database`);
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
        `Lỗi khi truy vấn email=${email} database.`
      );
      throw new InternalServerError();
    }
  }

  async findByEmailCache(email: string): Promise<UserPassword | null> {
    const luaScript = `
      const userId = redis.call("GET", "user:" .. KEYS[1]);
      if not userId then return nil end
      return redis.call("GET", "user:" .. userId)
    `;

    const logService = this.log.child({
      service: "FindByEmailService.findByEmailCache",
      source: "cache",
      operation: "redis.findUserByEmailLuaScript",
      luaScript,
    });

    try {
      this.redis.defineCommand("findUserByEmailLuaScript", {
        lua: luaScript,
        numberOfKeys: 1,
        readOnly: true,
      });

      const user = await this.redis.findUserByEmailLuaScript(email);

      if (!user) {
        logService.info(`Truy vấn key='user:${email}' không tồn tại.`);
        return null;
      }
      logService.info(`Truy vấn key='user:${email}' thành công.`);
      return JSON.parse(user) as UserPassword;
    } catch (error) {
      logService.warn({ error }, `Lỗi truy vấn key='user:${email}'.`);
      return null;
    }
  }
}
