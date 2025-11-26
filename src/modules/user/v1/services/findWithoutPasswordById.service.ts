import type { UserWithoutPassword } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { QueryConfig } from "pg";
import BaseUserService from "./base.service";

export default class FindWithoutPasswordByIdService extends BaseUserService {
  async execute(userId: string): Promise<UserWithoutPassword | null> {
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
              AS avatar
          FROM
              users u
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
      service: "FindWithoutPasswordByIdService.execute",
      source: "database",
      operation: "db.query",
      query: queryConfig,
    });

    try {
      const { rows } = await this.pool.query<UserWithoutPassword>(queryConfig);
      if (rows[0]) {
        logService.info(`Tìm thấy userId=${userId} trong database`);
        return rows[0];
      }
      logService.info(`Không tìm thấy userId=${userId} trong database`);
      return null;
    } catch (error: unknown) {
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
        `Lỗi khi truy vấn userId=${userId} database.`
      );
      throw new InternalServerError();
    }
  }
}
