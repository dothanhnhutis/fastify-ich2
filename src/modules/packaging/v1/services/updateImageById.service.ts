import fs from "node:fs";
import type { FileUpload } from "@modules/file/v1/file.types";
import type { MulterFile } from "@shared/middleware/multer";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import sharp from "sharp";
import BasePackagingService from "./base.service";

export default class UpdateImageByIdService extends BasePackagingService {
  async execute(
    packagingId: string,
    file: MulterFile,
    userId: string
  ): Promise<void> {
    const logService = this.log.child({
      service: "UpdateImageByIdService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let client: PoolClient | null = null;
    let step: number = 0;
    const maxStep: number = 3;
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
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      // thêm file mới

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
        UPDATE packaging_images
        SET deleted_at = $1::timestamptz(3), is_primary = $2::boolean
        WHERE packaging_id = $3::text AND is_primary = true
        `,
        values: [new Date(), false, packagingId],
      };
      await client.query(queryConfig);
      logService.info(
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.update",
          queryConfig,
        },
        `[${step}/${maxStep}] Xoá mềm ảnh bao bì cũ thành công.`
      );

      // thêm avatar
      const metadata = await sharp(files[0].path).metadata();
      queryConfig = {
        text: `
            INSERT INTO packaging_images (packaging_id, file_id, width, height, is_primary)
            VALUES ($1, $2, $3, $4, $5) RETURNING *;
          `,
        values: [
          packagingId,
          files[0].id,
          metadata.width,
          metadata.height,
          true,
        ],
      };

      await client.query(queryConfig);
      logService.info(
        {
          step: `${++step}/${maxStep}`,
          stepOperation: "db.insert",
          queryConfig,
        },
        `[${step}/${maxStep}] Tạo ảnh bao bì mới thành công.`
      );

      await client.query("COMMIT");
      logService.info(`[${step}/${maxStep}] Commit thành công.`);
    } catch (error) {
      logService.error(
        {
          queryConfig,
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
        `[${step}/${maxStep}] Lỗi cập nhật ảnh bao bì cho packagingId=${packagingId}.`
      );
      fs.unlink(file.path, (err) => {
        if (err) {
          logService.error(
            { error: err },
            `[${step}/${maxStep}] Xoá file thất bại.`
          );
        }
        logService.info(`[${step}/${maxStep}] Xoá file thành công.`);
      });
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
