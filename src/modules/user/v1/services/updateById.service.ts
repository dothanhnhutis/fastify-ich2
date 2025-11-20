import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { UserRequestType } from "../user.schema";
import BaseUserService from "./base.service";

export default class UpdateByIdService extends BaseUserService {
  async execute(
    userId: string,
    data: UserRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;

    const sets: string[] = [];
    const values: (string | null | Date)[] = [];
    let idx = 1;

    if (data.username !== undefined) {
      sets.push(`username = $${idx++}::text`);
      values.push(data.username);
    }

    if (data.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `deactived_at = $${idx++}::timestamptz`
      );
      values.push(data.status, data.status === "ACTIVE" ? null : new Date());
    }

    values.push(userId);

    let queryConfig: QueryConfig = {
      text: `UPDATE users SET ${sets.join(
        ", "
      )} WHERE id = $${idx} RETURNING *;`,
      values,
    };

    const logService = this.log.child({
      service: "UpdateByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let client: PoolClient | null = null;
    let step = 1;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      if (sets.length > 0) {
        await client.query(queryConfig);
        logService.info(
          { step: step++, stepOperation: "db.update", queryConfig },
          `Cập nhật thông tin userId=${userId} thành công.`
        );
      }

      if (data.roleIds) {
        if (data.roleIds.length === 0) {
          // xoá hết
          const queryConfig = {
            text: `
              DELETE FROM user_roles 
              WHERE 
                user_id = $1::text 
              RETURNING *;
            `,
            values: [userId],
          };

          await client.query(queryConfig);
          logService.info(
            {
              step: step++,
              stepOperation: "db.delete",
              queryConfig,
            },
            `Xoá hết vai trò của userId=${userId} thành công.`
          );
        } else {
          queryConfig = {
            text: `
                DELETE FROM user_roles
                WHERE 
                  user_id = $1::text
                  AND role_id != ALL($2::text[])
                RETURNING *;
              `,
            values: [userId, data.roleIds],
          };

          // xoá cai nao khong co trong list
          await client.query(queryConfig);
          logService.info(
            {
              step: step++,
              stepOperation: "db.delete",
              queryConfig,
            },
            `Xoá vai trò của userId=${userId} không trong danh sách thành công.`
          );

          queryConfig = {
            text: `
                INSERT INTO user_roles (user_id, role_id)
                VALUES ${data.roleIds
                  .map((_, i) => `($1, $${i + 2})`)
                  .join(", ")} 
                ON CONFLICT DO NOTHING;
              `,
            values: [userId, ...data.roleIds],
          };

          // tao nhung cai chua co
          await client.query(queryConfig);

          logService.info(
            {
              step: step++,
              stepOperation: "db.insert",
              queryConfig,
            },
            `Tạo vai trò mới cho userId=${userId} thành công.`
          );
        }
      }

      await client.query("COMMIT");
      logService.info(`Cập nhật tài khoản userId=${userId} thành công.`);
    } catch (error: unknown) {
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info("Rollback thành công.");
        } catch (rollbackErr) {
          logService.error({ error: rollbackErr }, "Rollback thất bại.");
        }
      }

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
        `Lỗi khi cập nhật userId=${userId} database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
