import type { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy } from "@shared/utils/helper";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import type { Warehouse } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

const sortPackagingFieldMap: Record<string, string> = {
  name: "w.name",
  min_stock_level: "w.permissions",
  unit: "w.description",
  pcs_ctn: "w.deactived_at",
  status: "w.status",
  deactived_at: "w.created_at",
  created_at: "w.updated_at",
  updated_at: "w.updated_at",
  quantity: "w.quantity",
};

const sortFieldMap: Record<string, string> = {
  name: "w.name",
  address: "w.address",
  disabled_at: "w.disabled_at",
  created_at: "w.created_at",
  updated_at: "w.updated_at",
};

export default class FindManyService extends BaseWarehouseService {
  async execute(
    query: WarehouseRequestType["Query"]["Querystring"]
  ): Promise<{ warehouses: Warehouse[]; metadata: Metadata }> {
    const baseSelect = `
          SELECT
              w.*,
              COUNT(pi.packaging_id) FILTER (
                  WHERE
                      pi.packaging_id IS NOT NULL
                      AND p.status = 'ACTIVE'
              )::int AS packaging_count
          FROM
              warehouses w
              LEFT JOIN packaging_inventory pi ON (pi.warehouse_id = w.id)
              LEFT JOIN packagings p ON (pi.packaging_id = p.id)
          `;
    const values: (string | number)[] = [];
    const where: string[] = [];
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
    let step = 1;
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");

      const { rows: countRows } = await client.query<{ count: number }>(
        queryConfig
      );
      const totalItem = countRows[0]?.count ?? 0;

      logService.info(
        {
          step: step++,
          stepOperation: "db.select",
          queryConfig,
        },
        `Có ${totalItem} kết quả.`
      );

      if (!totalItem) {
        await client.query("COMMIT");
        logService.info("Truy vấn thành công.");
        return {
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
      }

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

      const { rows: warehouses } = await client.query<Warehouse>(queryConfig);
      logService.info(
        {
          step: step++,
          stepOperation: "db.select",
          queryConfig,
        },
        "Truy vấn với sắp xếp và phân trang thành công."
      );
      const totalPage = Math.ceil(totalItem / limit) || 0;
      await client.query("COMMIT");

      logService.info("Truy vấn thành công.");

      return {
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
    } catch (error) {
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
        `Lỗi khi tạo người dùng mới trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
