import fs from "node:fs";
import type { FileUpload } from "@modules/shared/file/file.shared.types";
import type { MulterFile } from "@shared/middleware/multer";
import { InternalServerError } from "@shared/utils/error-handler";
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
    let step: number = 0;
    const maxStep: number = 3;
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
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.insert",
          queryConfig,
        },
        `[${step}/${maxStep}] Thêm file mới thành công.`
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
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.update",
          queryConfig,
        },
        `[${step}/${maxStep}] Xoá mềm ảnh đại diện cũ thành công.`
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
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.insert",
          queryConfig,
        },
        `[${step}/${maxStep}] Tạo ảnh đại diện mới thành công.`
      );

      await client.query("COMMIT");
      logService.info(
        `[${step}/${maxStep}] Cập nhật ảnh đại diện userId=${userId} thành công.`
      );
    } catch (error) {
      fs.unlink(file.path, (err) => {
        if (err) {
          logService.error(
            { error: err },
            `[${step}/${maxStep}] Xoá file thât bại.`
          );
        }
        logService.info(`[${step}/${maxStep}] Xoá file thanh công.`);
      });
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
        `[${step}/${maxStep}] Lỗi cập nhật ảnh đại diện cho userId=${userId}.`
      );
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info(`[${step}/${maxStep}] Rollback thành công.`);
        } catch (rollbackErr) {
          logService.error(
            { error: rollbackErr },
            `[${step}/${maxStep}] Rollback thất bại.`
          );
        }
      }

      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
