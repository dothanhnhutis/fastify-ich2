import type { Role } from "@modules/shared/role/role.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

export default class CreateService extends BaseRoleService {
  async execute(data: RoleRequestType["Create"]["Body"]) {
    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
      operation: "db.transaction",
    });

    const columns = ["name", "description", "permissions"];
    const values = [data.name, data.description, data.permissions];
    const placeholders = ["$1::text", "$2::text", "$3::text[]"];

    const queryConfig: QueryConfig = {
      text: `INSERT INTO roles (${columns.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) RETURNING *;`,
      values,
    };

    let client: PoolClient | null = null;
    let step: number = 1;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows } = await client.query<Role>(queryConfig);
      logService.info(
        {
          step: step++,
          stepOperation: "db.insert",
          queryConfig,
        },
        "Tạo vai trò mới thành công."
      );
      if (data.userIds.length > 0) {
        const queryConfig: QueryConfig = {
          text: `INSERT INTO user_roles (role_id, user_id) VALUES ${data.userIds
            .map((_, idx) => `($1, $${idx + 2})`)
            .join(", ")};`,
          values: [rows[0].id, ...data.userIds],
        };
        await client.query(queryConfig);
        logService.info(
          {
            step: step++,
            stepOperation: "db.insert",
            queryConfig,
          },
          `Tạo các vai trò cho roleId=${rows[0].id} thành công`
        );
      }

      await client.query("COMMIT");
      logService.info("Tạo vai trò mới thành công.");

      return rows[0];
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
        `Lỗi khi tạo vai trò mới trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
