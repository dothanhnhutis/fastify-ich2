import { BaseService } from "@shared/base-service";
import type { FastifyRequest } from "fastify";

export default class BaseRoleService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "user", version: "v1" });
  }

  protected async invalidateUserRolesCache(userIds: string[]) {
    const luaScript = `
      local keyDeleted = {}
      for i = 1, #ARGV do
        local id = ARGV[i]
        local rolesKey = "user:" .. id .. ":roles"
        local count = redis.call("DEL", rolesKey)
        table.insert(keyDeleted, emailKey)
      end
      return keyDeleted
    `;

    const logService = this.log.child({
      service: "CreateService.invalidateUserRolesCache",
      source: "cache",
      operation: "redis.invalidateUserLuaScript",
      luaScript,
    });

    try {
      this.redis.defineCommand("invalidateUserRolesLuaScript", {
        lua: luaScript,
        numberOfKeys: 0,
        readOnly: false,
      });

      await this.redis.invalidateUserRolesLuaScript(...userIds);

      logService.info(
        `Làm mất hiệu lục bộ nhớ đệm userId=${userIds.join(", ")} thành công.`
      );
    } catch (error) {
      logService.warn(
        { error },
        `Lỗi khi Làm mất hiệu lục bộ nhớ đệm userId=${userIds.join(", ")}.`
      );
    }
  }
}
