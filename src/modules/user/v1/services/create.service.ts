import { InternalServerError } from "@shared/utils/error-handler";
import { generatePassword, hashPassword } from "@shared/utils/password";
import type { PoolClient, QueryConfig } from "pg";
import type { UserPassword, UserRequestType } from "../user.types";
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
      operation: "db.transaction",
    });
    let step: number = 0;
    const maxStep: number = data.roleIds && data.roleIds.length > 0 ? 3 : 2;

    let client: PoolClient | null = null;

    const baseInsert =
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *;";
    const values: unknown[] = [data.email, data.username];

    let queryConfig: QueryConfig = {
      text: baseInsert,
      values: [...values, password_hash],
    };

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows: userRow } = await client.query<UserPassword>(queryConfig);
      logService.info(
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.insert",
          queryConfig: {
            text: baseInsert,
            values: [...values, "***"],
          },
        },
        `[${step}/${maxStep}] Tạo tài khoản mới thành công.`
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
            step: `${++step}/${maxStep}`,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `[${step}/${maxStep}] Tạo các vai trò cho userId=${userRow[0].id} thành công.`
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
          step: `${++step}/${maxStep}`,
          channelKey: "publish-user-channel",
          data: {
            email: data.email,
            password: "***",
          },
        },
        `[${step}/${maxStep}] Gửi mật khẩu qua email cho userId=${userRow[0].id} thành công`
      );

      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);

      return userRow[0];
    } catch (error) {
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
        `[${step}/${maxStep}] Lỗi khi tạo tài khoản mới trong database.`
      );
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info(`[${step}/${maxStep}] Rollback thành công.`);
        } catch (rollbackErr) {
          logService.error(
            { error: rollbackErr },
            `[${step}/${maxStep}] Rollback thất bại.`
          );
        }
      }
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
