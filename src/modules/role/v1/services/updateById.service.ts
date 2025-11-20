import type { Role } from "@modules/shared/role/role.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

export default class UpdateByIdService extends BaseRoleService {
  async execute(
    roleId: string,
    data: RoleRequestType["UpdateById"]["Body"]
  ): Promise<void> {
    if (Object.keys(data).length === 0) return;

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) {
      sets.push(`name = $${idx++}::text`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      sets.push(`description = $${idx++}::text`);
      values.push(data.description);
    }
    if (data.permissions !== undefined) {
      sets.push(`permissions = $${idx++}::text[]`);
      values.push(data.permissions);
    }
    if (data.status !== undefined) {
      sets.push(
        `status = $${idx++}::text`,
        `deactived_at = ${
          data.status === "ACTIVE" ? `$${idx++}` : `$${idx++}::timestamptz`
        }`
      );
      values.push(data.status, data.status === "ACTIVE" ? null : new Date());
    }

    values.push(roleId);

    let queryConfig: QueryConfig = {
      text: `UPDATE roles SET ${sets.join(
        ", "
      )} WHERE id = $${idx} RETURNING *;`,
      values,
    };

    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let client: PoolClient | null = null;

    let step = 1;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      if (sets.length > 0) {
        await client.query<Role>(queryConfig);
        logService.info(
          {
            step: step++,
            stepOperation: "db.update",
            queryConfig,
          },
          `Cập nhật vai trò roleId=${roleId} thành công.`
        );
      }

      if (data.userIds)
        if (data.userIds.length === 0) {
          queryConfig = {
            text: `
              DELETE FROM user_roles
              WHERE
                  role_id = $1::text
              RETURNING *;
            `,
            values: [roleId],
          };
          // xoá hết
          await client.query(queryConfig);
          logService.info(
            {
              step: step++,
              stepOperation: "db.delete",
              queryConfig,
            },
            `Xoá hết người dùng của roleId=${roleId} thành công.`
          );
        } else {
          queryConfig = {
            text: `
              DELETE FROM user_roles
              WHERE
                  role_id = $1::text
                  AND user_id != ALL($2::text[])
              RETURNING *;
            `,
            values: [roleId, data.userIds],
          };
          // xoá
          await client.query(queryConfig);
          logService.info(
            {
              step: step++,
              stepOperation: "db.delete",
              queryConfig,
            },
            `Xoá người dùng của roleId=${roleId} không có trong danh sách thành công`
          );
          queryConfig = {
            text: `
              INSERT INTO user_roles (role_id, user_id) 
              VALUES ${data.userIds
                .map((_, idx) => `($1, $${idx + 2})`)
                .join(", ")}
              ON CONFLICT DO NOTHING;
            `,
            values: [roleId, ...data.userIds],
          };
          // tạo mới
          await client.query(queryConfig);
          logService.info(
            {
              step: step++,
              stepOperation: "db.insert",
              queryConfig,
            },
            `Tạo người dùng mới cho roleId=${roleId} thành công.`
          );
        }

      await client.query("COMMIT");
      logService.info(`Cập nhật vai trò roleId=${roleId} thành công.`);
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackErr) {
          logService.error({ error: rollbackErr }, "Rollback thất bại.");
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
        `Lỗi khi cập nhật vai trò roleId=${roleId} trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
