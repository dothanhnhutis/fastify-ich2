import type { Role } from "@modules/shared/role/role.shared.types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { RoleRequestType } from "../role.schema";
import BaseRoleService from "./base.service";

export default class CreateService extends BaseRoleService {
  async execute(data: RoleRequestType["Create"]["Body"]) {
    const columns = ["name", "description", "permissions"];
    const values = [data.name, data.description, data.permissions];
    const placeholders = ["$1::text", "$2::text", "$3::text[]"];

    let queryConfig: QueryConfig = {
      text: `INSERT INTO roles (${columns.join(
        ", "
      )}) VALUES (${placeholders.join(", ")}) RETURNING *;`,
      values,
    };

    if (!data.userIds) {
      const logService = this.log.child({
        service: "CreateService.execute",
        source: "database",
        operation: "db.insert",
        queryConfig,
      });

      try {
        const { rows } = await this.pool.query<Role>(queryConfig);
        logService.info("Tạo vai trò thành công.");
        return rows[0];
      } catch (error) {
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
          `Lỗi khi tạo vai trò mới trong database.`
        );
        throw new InternalServerError();
      }
    }

    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
    });

    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const { rows } = await client.query<Role>(queryConfig);

      logService.info(
        {
          step: `1/2`,
          stepOperation: "db.insert",
          queryConfig,
        },
        "Tạo vai trò mới thành công."
      );

      const newRole = rows[0];
      if (data.userIds.length > 0) {
        queryConfig = {
          text: `INSERT INTO user_roles (role_id, user_id) VALUES ${data.userIds
            .map((_, idx) => `($1, $${idx + 2})`)
            .join(", ")};`,
          values: [newRole.id, ...data.userIds],
        };
        await client.query(queryConfig);
        logService.info(
          {
            step: `2/2`,
            stepOperation: "db.insert",
            queryConfig: queryConfig,
          },
          `Tạo các vai trò cho userId=${newRole.id} thành công`
        );
      }

      await client.query("COMMIT");
      logService.info("Tạo vai trò mới thành công.");
      // if (data.userIds.length > 0) {
      //   await this.invalidateUserRolesCache(data.userIds);
      // }
      return newRole;
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
