import { BaseService } from "@shared/base-service";
import type { FastifyRequest } from "fastify";

export default class BaseUserService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "user", version: "v1" });
  }

  // protected async invalidateCache(userId: string): Promise<void> {
  //   const luaScript = `
  //     local userString = redis.call("GET", "user:" .. KEYS[1])
  //     if not userString then return 0 end
  //     local user = cjson.decode(userString)
  //     redis.call("DEL", "user:" .. user.id)
  //     redis.call("DEL", "user:" .. user.email)
  //     redis.call("DEL", "user:" .. user.id .. ":roles")
  //     return 0
  //   `;

  //   const logService = this.log.child({
  //     service: "BaseUserService.invalidateCache",
  //     source: "cache",
  //     operation: "redis.invalidateUserLuaScript",
  //     luaScript,
  //   });

  //   try {
  //     this.redis.defineCommand("invalidateUserLuaScript", {
  //       lua: luaScript,
  //       numberOfKeys: 1,
  //       readOnly: false,
  //     });

  //     const deleted = await this.redis.invalidateUserLuaScript(userId);

  //     if (!deleted)
  //       logService.info(
  //         `Làm mất hiệu lục bộ nhớ đệm userId=${userId} thất bại.`
  //       );
  //     logService.info(
  //       `Làm mất hiệu lục bộ nhớ đệm userId=${userId} thành công.`
  //     );
  //   } catch (error) {
  //     logService.warn(
  //       { error },
  //       `Lỗi khi Làm mất hiệu lục bộ nhớ đệm userId=${userId}.`
  //     );
  //   }
  // }

  // protected async invalidateUsersCache(userIds: string[]): Promise<void> {
  //   const luaScript = `
  //     local deleted = 0

  //     for i = 1, #ARGV do
  //       local id = ARGV[i]
  //       local userKey = "user:" .. id
  //       local rolesKey = "user:" .. id .. ":roles"

  //       -- Lấy user để biết email (nếu cần)
  //       local userStr = redis.call("GET", userKey)
  //       local emailKey = nil

  //       if userStr then
  //         local ok, userObj = pcall(cjson.decode, userStr)
  //         if ok and userObj and userObj["email"] then
  //           emailKey = "user:" .. userObj["email"]
  //         end
  //       end

  //       -- Gom key cần xoá vào table
  //       local keysToDelete = {userKey, rolesKey}
  //       if emailKey then
  //         table.insert(keysToDelete, emailKey)
  //       end

  //       -- Xoá tất cả một lần
  //       local count = redis.call("DEL", unpack(keysToDelete))
  //       deleted = deleted + count
  //     end

  //     return deleted
  //   `;
  //   const logService = this.log.child({
  //     service: "CreateService.invalidateUsersCache",
  //     source: "cache",
  //     operation: "redis.invalidateUserLuaScript",
  //     luaScript,
  //   });

  //   try {
  //     this.redis.defineCommand("invalidateUsersLuaScript", {
  //       lua: luaScript,
  //       numberOfKeys: 0,
  //       readOnly: false,
  //     });

  //     await this.redis.invalidateUsersLuaScript(...userIds);

  //     // if (deleted)
  //     //   logService.info(
  //     //     `Làm mất hiệu lục bộ nhớ đệm userIds=${userIds.join(", ")} thất bại.`
  //     //   );
  //     logService.info(
  //       `Làm mất hiệu lục bộ nhớ đệm userId=${userIds.join(", ")} thành công.`
  //     );
  //   } catch (error) {
  //     logService.warn(
  //       { error },
  //       `Lỗi khi Làm mất hiệu lục bộ nhớ đệm userId=${userIds.join(", ")}.`
  //     );
  //   }
  // }

  // protected async saveToCache(
  //   userMore: UserPassword & { roles?: Role[] }
  // ): Promise<void> {
  //   const { roles, ...user } = userMore;
  //   const logService = this.log.child({
  //     service: "BaseUserService.saveToCache",
  //     source: "cache",
  //     operation: "redis.multi",
  //     commands: roles
  //       ? [
  //           "SET userId->user:[email]",
  //           "SET user->user:[id]",
  //           "SET roles->user:[id]:roles",
  //         ]
  //       : ["SET userId->user:[email]", "SET user->user:[id]"],
  //   });
  //   try {
  //     const transaction = this.redis.multi();
  //     transaction.set(`user:${user.email}`, user.id, "EX", env.REDIS_TTL);
  //     transaction.set(
  //       `user:${user.id}`,
  //       JSON.stringify(user),
  //       "EX",
  //       env.REDIS_TTL
  //     );

  //     if (roles) {
  //       transaction.set(
  //         `user:${user.id}:roles`,
  //         JSON.stringify(roles),
  //         "EX",
  //         env.REDIS_TTL
  //       );
  //     }

  //     const results = await transaction.exec();
  //     results?.forEach(([err, res], idx) => {
  //       if (err) {
  //         logService.warn(
  //           { step: idx + 1, err },
  //           "Lỗi khi lưu key trong transaction"
  //         );
  //       } else {
  //         // check here
  //         logService.info({ step: idx + 1, res }, "Lưu key thành công");
  //       }
  //     });
  //   } catch (err: unknown) {
  //     logService.warn({ err }, "Lỗi khi lưu vào cache.");
  //   }
  // }

  // protected async invalidateAllQueryCache(): Promise<void> {
  //   const luaScript = `
  //     local cursor = "0"
  //     local deleted = 0
  //     local pattern = KEYS[1]
  //     local count = ARGV[1] or 100
  //     repeat
  //       local scan = redis.call("SCAN", cursor, "MATCH", pattern, "COUNT", count)
  //       cursor = scan[1]
  //       local keys = scan[2]
  //       if #keys > 0 then
  //         redis.call("DEL", unpack(keys))
  //         deleted = deleted + #keys
  //       end
  //     until cursor == "0"
  //     return deleted
  //   `;

  //   const logService = this.log.child({
  //     service: "BaseUserService.invalidateAllQueryCache",
  //     source: "cache",
  //     operation: "redis.invalidateAllUserQueryLuaScript",
  //     luaScript,
  //   });

  //   try {
  //     this.redis.defineCommand("invalidateAllUserQueryLuaScript", {
  //       lua: luaScript,
  //       numberOfKeys: 1,
  //       readOnly: false,
  //     });

  //     const countDeleted = await this.redis.invalidateAllUserQueryLuaScript(
  //       "user:query:*"
  //     );

  //     logService.info(
  //       `Làm mất hiệu lực ${countDeleted} bộ nhớ đệm keys='user:query:*' thành công.`
  //     );
  //   } catch (error) {
  //     logService.warn(
  //       { error },
  //       `Lỗi khi Làm mất hiệu lục bộ nhớ đệm keys='user:query:*'.`
  //     );
  //   }
  // }
}
