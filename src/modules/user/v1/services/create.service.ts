import type { UserPassword } from "@modules/shared/user/user.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import { generatePassword, hashPassword } from "@shared/utils/password";
import type { PoolClient, QueryConfig } from "pg";
import type { UserRequestType } from "../user.schema";
import BaseUserService from "./base.service";

export default class CreateService extends BaseUserService {
  async execute(
    data: UserRequestType["Create"]["Body"]
  ): Promise<UserPassword> {
    const password = data.password ?? generatePassword();
    const password_hash = await hashPassword(password);
    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
    });
    const maxStep = data.roleIds && data.roleIds.length > 0 ? 3 : 2;
    let step: number = 1;
    let client: PoolClient | null = null;
    let queryConfig: QueryConfig = {
      text: `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *;`,
      values: [data.email, data.username, password_hash],
    };

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows: userRow } = await client.query<UserPassword>(queryConfig);
      logService.info(
        {
          step: `${step++}/${maxStep}`,
          stepOperation: "db.insert",
          queryConfig: {
            text: `INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *;`,
            values: [data.email, data.username, "***"],
          },
        },
        "Tạo người dùng mới thành công."
      );

      if (data.roleIds && data.roleIds.length > 0) {
        const values: string[] = [];
        const placeholder = data.roleIds
          .map((id, i) => {
            const idx = i * 2;
            values.push(userRow[0].id, id);
            return `($${idx + 1}, $${idx + 2})`;
          })
          .join(", ");

        queryConfig = {
          text: `INSERT INTO user_roles (user_id, role_id) VALUES ${placeholder}`,
          values,
        };

        await client.query(queryConfig);
        logService.info(
          {
            step: `${step++}/${maxStep}`,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `Tạo các vai trò cho userId=${userRow[0].id} thành công`
        );
      }
      const channel = this.amqp.getChannel("publish-user-channel");

      channel.publish(
        "user-mail-direct",
        "create-new-user",
        Buffer.from(JSON.stringify({ email: data.email, password })),
        { persistent: true }
      );

      logService.info(
        {
          step: `${step++}/${maxStep}`,
          channelKey: "publish-user-channel",
          data: {
            email: data.email,
            password: "***",
          },
        },
        `Gửi mật khẩu qua email cho userId=${userRow[0].id} thành công`
      );

      await client.query("COMMIT");
      logService.info("Tạo người dùng mới thành công.");

      // await this.invalidateAllQueryCache();

      console.log("newUser", userRow[0]);
      return userRow[0];
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackErr) {
          logService.error({ error: rollbackErr }, "Rollback failed");
        }
      }
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
        `Lỗi khi tạo người dùng mới trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
