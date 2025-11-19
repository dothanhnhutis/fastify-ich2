import Redis, { type RedisOptions } from "ioredis";

declare module "ioredis" {
  interface Redis {
    findUserByEmailLuaScript(email: string): Promise<string | null>;
    findUserDetailByIdlLuaScript(
      userId: string
    ): Promise<[string, string] | null>;
    invalidateUserLuaScript(userId: string): Promise<number>;
    invalidateUsersLuaScript(...userIds: string[]): Promise<number>;
    invalidateUserRolesLuaScript(...userIds: string[]): Promise<string[]>;
    invalidateAllUserQueryLuaScript(
      pattern: string,
      scanCount?: number
    ): Promise<number>;

    findSessionsByUserIdLuaScript(
      userId: string,
      scanCount?: number
    ): Promise<string[]>;
  }
}

export default class RedisCustom extends Redis {
  constructor(options?: RedisOptions) {
    super(options ?? {});
  }
}
