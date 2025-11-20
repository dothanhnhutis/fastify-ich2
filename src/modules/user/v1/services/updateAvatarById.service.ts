import type { FileUpload } from "@modules/shared/file/file.shared.types";
import type { MulterFile } from "@shared/middleware/multer";
import { InternalServerError } from "@shared/utils/error-handler";
import { deleteFile } from "@shared/utils/file";
import type { PoolClient, QueryConfig } from "pg";
import sharp from "sharp";
import BaseUserService from "./base.service";

export default class UpdateAvatarById extends BaseUserService {
  async execute(userId: string, file: MulterFile): Promise<void> {
    const logService = this.log.child({
      service: "UserService.execute",
      source: "database",
      operation: "db.transaction",
    });
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      // thêm file mới
      let queryConfig: QueryConfig = {
        text: `
            INSERT INTO files (original_name, mime_type, destination, file_name, path, size, owner_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;      
          `,
        values: [
          file.originalname,
          file.mimetype,
          file.destination,
          file.filename,
          file.path,
          file.size,
          userId,
        ],
      };

      const { rows: files } = await client.query<FileUpload>(queryConfig);
      logService.info(
        { step: "1/3", stepOperation: "db.insert", queryConfig },
        "Thêm file mới thành công."
      );

      // xoá mềm avatar cũ
      queryConfig = {
        text: `
            UPDATE user_avatars
            SET deleted_at = $1::timestamptz(3), is_primary = false
            WHERE user_id = $2::text AND is_primary = true
          `,
        values: [new Date(), userId],
      };
      await client.query(queryConfig);
      logService.info(
        { step: "2/3", stepOperation: "db.update", queryConfig },
        "Xoá mềm ảnh đại diện cũ thành công."
      );

      // thêm avatar
      const metadata = await sharp(files[0].path).metadata();
      queryConfig = {
        text: `
            INSERT INTO user_avatars (user_id, file_id, width, height, is_primary)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
          `,
        values: [userId, files[0].id, metadata.width, metadata.height, true],
      };

      await client.query(queryConfig);
      logService.info(
        { step: "3/3", stepOperation: "db.insert", queryConfig },
        "Tạo ảnh đại diện mới thành công."
      );

      await client.query("COMMIT");
      logService.info(`Cập nhật ảnh đại diện userId=${userId} thành công.`);
    } catch (error) {
      deleteFile(file.path);
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
        `Lỗi cập nhật ảnh đại diện cho userId=${userId}.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
