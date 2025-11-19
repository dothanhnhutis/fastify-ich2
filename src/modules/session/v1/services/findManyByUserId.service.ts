import { InternalServerError } from "@shared/utils/error-handler";
import type { Session } from "../session.types";
import BaseSessionService from "./base.service";

export default class FindManyByUserIdService extends BaseSessionService {
  async execute(userId: string): Promise<Session[]> {
    const luaScript = `
      local cursor = "0"
      local result = {}
      local userId = KEYS[1]
      local count = tonumber(ARGV[1]) or 100

      repeat
        -- SCAN tất cả key của user
        local scan = redis.call("SCAN", cursor, "MATCH", "sid:" .. userId .. ":*", "COUNT", count)
        cursor = scan[1]
        local keys = scan[2]

        if #keys > 0 then
          -- Lấy nhiều value cùng lúc
          local values = redis.call("MGET", unpack(keys))
          for _, v in ipairs(values) do
            if v then
              table.insert(result, v)  -- push trực tiếp vào mảng kết quả
            end
          end
        end
      until cursor == "0"

      -- Trả về Lua table, Redis client sẽ nhận array string
      return result
    `;
    const logService = this.log.child({
      service: "FindManyByUserIdService.execute",
      source: "cache",
      operation: "redis.findSessionsByUserIdLuaScript",
      luaScript,
    });

    try {
      this.redis.defineCommand("findSessionsByUserIdLuaScript", {
        lua: luaScript,
        readOnly: true,
        numberOfKeys: 1,
      });

      const sessionsString = await this.redis.findSessionsByUserIdLuaScript(
        userId
      );

      console.log("sessionsString", sessionsString);

      const sessions = sessionsString.map((s) => JSON.parse(s) as Session);

      logService.info(
        `Lấy tất cả phiên đăng nhập của userId=${userId} thành công.`
      );
      return sessions;
    } catch (error) {
      logService.error(
        { error },
        `Lỗi lấy tất cả phiên đăng nhập của userId=${userId}.`
      );
      throw new InternalServerError();
    }
  }
}
