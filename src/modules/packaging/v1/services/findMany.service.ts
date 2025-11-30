import type { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { PackagingDetail } from "summary-types";
import type { PackagingRequestType } from "../packaging.types";
import BasePackagingService from "./base.service";

const sortFieldMap: Record<string, string> = {
  name: "w.name",
  min_stock_level: "w.min_stock_level",
  unit: "w.unit",
  pcs_ctn: "w.pcs_ctn",
  status: "w.status",
  disabled_at: "w.disabled_at",
  created_at: "w.created_at",
  updated_at: "w.updated_at",
  warehouse_count: "warehouse_count",
  total_quantity: "total_quantity",
};

export default class FindManyService extends BasePackagingService {
  async execute(
    query: PackagingRequestType["Query"]["Querystring"]
  ): Promise<{ warehouses: PackagingDetail[]; metadata: Metadata }> {
    const baseSelect = `
    SELECT p.*,
          SUM(pi.quantity)::int AS total_quantity,
          COUNT(w.id IS NOT NULL)::int AS warehouse_count,
          COALESCE(
              json_agg(
                  json_build_object(
                      'id', w.id,
                      'name', w.name,
                      'address', w.address,
                      'status', w.status,
                      'disabled_at', w.disabled_at,
                      'deleted_at', w.deleted_at,
                      'created_ad', w.created_at,
                      'updated_at', w.updated_at,
                      'quantity', pi.quantity
                  )
              ) FILTER ( WHERE w.id IS NOT NULL ), '[]'
          ) AS warehouses
    FROM packagings p
        LEFT JOIN packaging_images pim ON pim.packaging_id = p.id AND pim.is_primary = TRUE AND pim.deleted_at IS NULL
        LEFT JOIN files f ON f.id = pim.file_id
        LEFT JOIN packaging_inventory pi ON pi.packaging_id = p.id
        LEFT JOIN warehouses w ON w.id = pi.warehouse_id
    `;
    const values: unknown[] = [];
    const where: string[] = ["p.deleted_at IS NULL"];
    let idx = 1;

    if (query.name !== undefined) {
      where.push(`p.name ILIKE $${idx++}::text`);
      values.push(`%${query.name.trim()}%`);
    }

    if (query.unit !== undefined) {
      where.push(`p.unit = $${idx++}::text`);
      values.push(query.unit);
    }

    if (query.status !== undefined) {
      where.push(
        `status = $${idx++}::text`,
        query.status === "ACTIVE"
          ? "disabled_at IS NULL"
          : "disabled_at IS NOT NULL"
      );
      values.push(query.status);
    }

    if (query.created_from) {
      where.push(`p.created_at >= $${idx++}::timestamptz`);
      values.push(query.created_from);
    }

    if (query.created_to) {
      where.push(`p.created_at <= $${idx++}::timestamptz`);
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

    let result: { warehouses: PackagingDetail[]; metadata: Metadata } = {
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

        const { rows: warehouses } = await client.query<PackagingDetail>(
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
