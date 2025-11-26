import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import type { UserDetailWithoutPassword } from "summary-types";
import BaseUserService from "./base.service";

export default class FindDetailByIdService extends BaseUserService {
  async execute(userId: string): Promise<UserDetailWithoutPassword | null> {
    const queryConfig: QueryConfig = {
      text: `
            SELECT
                u.id,
                u.email,
                (u.password_hash IS NOT NULL)::boolean AS has_password,
                u.username,
                u.status,
                u.deactived_at,
                u.created_at,
                u.updated_at,
                COUNT(r.id) FILTER (
                    WHERE
                        r.id IS NOT NULL
                        AND r.status = 'ACTIVE'
                )::int AS role_count,
                CASE
                    WHEN av.file_id IS NOT NULL THEN 
                      json_build_object(
                          'id',
                          av.file_id,
                          'width',
                          av.width,
                          'height',
                          av.height,
                          'is_primary',
                          av.is_primary,
                          'original_name',
                          f.original_name,
                          'mime_type',
                          f.mime_type,
                          'destination',
                          f.destination,
                          'file_name',
                          f.file_name,
                          'size',
                          f.size,
                          'created_at',
                          to_char(
                              av.created_at AT TIME ZONE 'UTC',
                              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                            )
                      )
                    ELSE null
                END 
                AS avatar,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id',
                            r.id,
                            'name',
                            r.name,
                            'permissions',
                            r.permissions,
                            'description',
                            r.description,
                            'status',
                            r.status,
                            'deactived_at',
                            r.deactived_at,
                            'can_delete',
                            r.can_delete,
                            'can_update',
                            r.can_update,
                            'created_at',
                            r.created_at,
                            'updated_at',
                            r.updated_at
                        )
                    ) FILTER (
                        WHERE
                            r.id IS NOT NULL
                          
                    ),
                    '[]'
                ) AS roles
            FROM
                users u
                LEFT JOIN user_roles ur ON ur.user_id = u.id
                LEFT JOIN roles r ON ur.role_id = r.id
                LEFT JOIN user_avatars av ON av.user_id = u.id
                AND av.deleted_at IS NULL
                AND av.is_primary = true
                LEFT JOIN files f ON f.id = av.file_id
                AND av.deleted_at IS NULL
            WHERE
                u.id = $1::text
            GROUP BY
                u.id,
                u.email,
                u.password_hash,
                u.username,
                u.status,
                u.deactived_at,
                u.created_at,
                u.updated_at,
                av.file_id,
                av.width,
                av.height,
                av.is_primary,
                av.created_at,
                f.original_name,
                f.mime_type,
                f.destination,
                f.file_name,
                f.size
            LIMIT
                1;
          `,
      values: [userId],
    };

    const logService = this.log.child({
      service: "FindDetailByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<UserDetailWithoutPassword>(
        queryConfig
      );
      if (rows[0]) {
        logService.info(
          `Tìm thấy thông tin chi tiết userId=${userId} trong database`
        );
        return rows[0];
      }
      logService.info(
        `Không tìm thấy thông tin chi tiết userId=${userId} trong database`
      );
      return null;
    } catch (error: unknown) {
      this.log.error(
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
        `Lỗi khi truy vấn thông tin chi tiết userId=${userId} database.`
      );
      throw new InternalServerError();
    }
  }

  async findDetailByIdCache(
    userId: string
  ): Promise<UserDetailWithoutPassword | null> {
    const luaScript = `
      local user = redis.call("GET", "user:" .. KEYS[1])
      local userRoles = redis.call("GET", "user:" .. KEYS[1] .. ":roles")
      if not user or not userRoles then return nil end
      return {user, userRoles}
    `;

    const logService = this.log.child({
      service: "FindByEmailService.findDetailByIdCache",
      source: "cache",
      operation: "redis.findUserDetailByIdlLuaScript",
      luaScript,
    });

    try {
      this.redis.defineCommand("findUserDetailByIdlLuaScript", {
        lua: luaScript,
        numberOfKeys: 1,
        readOnly: true,
      });

      const userDetailString = await this.redis.findUserDetailByIdlLuaScript(
        userId
      );
      if (!userDetailString) {
        logService.info(
          `Truy vấn thông tin chi tiết userId=${userId} không thành công.`
        );
        return null;
      }

      logService.info(
        `Truy vấn thông tin chi tiết userId=${userId} thành công.`
      );
      return {
        ...JSON.parse(userDetailString[0]),
        roles: JSON.parse(userDetailString[1]),
      } as UserDetailWithoutPassword;
    } catch (error) {
      logService.warn(
        { error },
        `Lỗi truy vấn thông tin chi tiết userId=${userId}`
      );
      return null;
    }
  }
}
