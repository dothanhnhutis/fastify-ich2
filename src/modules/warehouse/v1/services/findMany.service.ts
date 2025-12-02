import type { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseDetail, WarehouseRequestType } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

const sortFieldMap: Record<string, string> = {
  name: "w.name",
  address: "w.address",
  status: "w.status",
  disabled_at: "w.disabled_at",
  created_at: "w.created_at",
  updated_at: "w.updated_at",
};

export default class FindManyService extends BaseWarehouseService {
  async execute(
    query: WarehouseRequestType["Query"]["Querystring"]
  ): Promise<{ warehouses: WarehouseDetail[]; metadata: Metadata }> {
    const baseSelect = `
    SELECT w.*,
          (
            SELECT COUNT(*)
            FROM packaging_inventory pi2
                JOIN packagings p2 ON p2.id = pi2.packaging_id 
                    AND p2.deleted_at IS NULL
            WHERE pi2.warehouse_id = w.id
          )::int AS packaging_count,
          COALESCE(
              json_agg(
                  json_build_object(
                      'id', p.id,
                      'name', p.name,
                      'min_stock_level', p.min_stock_level,
                      'unit', p.unit,
                      'pcs_ctn', p.pcs_ctn,
                      'status', p.status,
                      'disabled_at',
                      to_char(p.disabled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                      'deleted_at',
                      to_char(p.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                      'created_at', to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                      'updated_at', to_char(p.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                      'quantity', p.quantity,
                      'image', p.image
                  )
              )
          ) AS packagings
    FROM warehouses w
        LEFT JOIN LATERAL (
            SELECT p.*,
              (
                CASE
                    WHEN pim.file_id IS NOT NULL THEN
                        json_build_object(
                            'id', pim.file_id,
                            'width', pim.width,
                            'height', pim.height,
                            'is_primary', pim.is_primary,
                            'original_name', f.original_name,
                            'mime_type', f.mime_type,
                            'destination', f.destination,
                            'file_name', f.file_name,
                            'size', f.size,
                            'created_at', to_char(pim.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
                        )
                END
              ) AS image,
              pi.quantity
            FROM packagings p
                LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
                LEFT JOIN packaging_images pim ON pim.packaging_id = p.id 
                    AND pim.is_primary = TRUE 
                    AND p.deleted_at IS NULL
                LEFT JOIN files f ON f.id = pim.file_id
            WHERE pi.warehouse_id = w.id
                AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT 10
        ) p ON TRUE
    `;
    const values: (string | number)[] = [];
    const where: string[] = ["w.deleted_at IS NULL"];
    let idx = 1;

    if (query.name !== undefined) {
      where.push(`w.name ILIKE $${idx++}::text`);
      values.push(`%${query.name.trim()}%`);
    }

    if (query.address !== undefined) {
      where.push(`w.address ILIKE $${idx++}::text`);
      values.push(`%${query.address.trim()}%`);
    }

    if (query.deleted !== undefined) {
      where.push(
        query.deleted ? `w.disabled_at IS NOT NULL` : `w.disabled_at IS NULL`
      );
    }

    if (query.created_from) {
      where.push(`w.created_at >= $${idx++}::timestamptz`);
      values.push(query.created_from);
    }

    if (query.created_to) {
      where.push(`w.created_at <= $${idx++}::timestamptz`);
      values.push(query.created_to);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const groupByClause = `GROUP BY w.id`;

    const logService = this.log.child({
      service: "FindManyService.execute",
      source: "database",
      operation: "db.transaction",
    });

    let queryConfig: QueryConfig = {
      text: `
      WITH warehouses AS (
        ${baseSelect}
        ${whereClause}
        ${groupByClause}
      )
      SELECT COUNT(*)::int AS count FROM warehouses;
      `,
      values,
    };
    let step = 0;
    let client: PoolClient | null = null;
    let maxStep: number = 2;

    let result: { warehouses: WarehouseDetail[]; metadata: Metadata } = {
      warehouses: [],
      metadata: {
        totalItem: 0,
        totalPage: 0,
        hasNextPage: false,
        limit: 0,
        itemStart: 0,
        itemEnd: 0,
      },
    };
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows: countRows } = await client.query<{ count: number }>(
        queryConfig
      );
      const totalItem = countRows[0]?.count ?? 0;

      logService.info(
        {
          step: `${++step}/${totalItem === 0 ? --maxStep : maxStep}`,
          stepOperation: "db.select",
          queryConfig,
        },
        `[${step}/${maxStep}] Có ${totalItem} kết quả.`
      );

      if (totalItem > 0) {
        const orderByClause = buildOrderBy(sortFieldMap, query.sort);

        const limit = query.limit ?? totalItem;
        const page = query.page ?? 1;
        const offset = (page - 1) * limit;

        queryConfig = {
          text: `
          ${baseSelect}
          ${whereClause}
          ${groupByClause}
          ${orderByClause}
          LIMIT $${idx++}::int OFFSET $${idx}::int
        `,
          values: [...values, limit, offset],
        };

        const { rows: warehouses } = await client.query<WarehouseDetail>(
          queryConfig
        );
        logService.info(
          {
            step: step++,
            stepOperation: "db.select",
            queryConfig,
          },
          "Truy vấn với sắp xếp và phân trang thành công."
        );
        const totalPage = Math.ceil(totalItem / limit) || 0;
        result = {
          warehouses,
          metadata: {
            totalItem,
            totalPage,
            hasNextPage: page < totalPage,
            limit: totalItem > 0 ? limit : 0,
            itemStart: totalItem > 0 ? (page - 1) * limit + 1 : 0,
            itemEnd: Math.min(page * limit, totalItem),
          },
        };
      }
      await client.query("COMMIT");
      logService.info("Commit thành công.");
      return result;
    } catch (error) {
      logService.error(
        {
          queryConfig,
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
        `[${step}/${maxStep}] Lỗi khi truy vấn nhà kho trong database.`
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
