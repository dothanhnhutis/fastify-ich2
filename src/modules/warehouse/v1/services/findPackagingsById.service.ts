import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import BaseWarehouseService from "./base.service";
import { PackagingAtWarehouse } from "../warehouse.types";
import { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import { buildOrderBy } from "@shared/utils/helper";

const sortFieldMap: Record<string, string> = {
  name: "name",
  min_stock_level: "min_stock_level",
  unit: "unit",
  pcs_ctn: "pcs_ctn",
  status: "status",
  deactived_at: "deactived_at",
  quantity: "quantity",
  created_at: "created_at",
  updated_at: "updated_at",
};

export class FindPackagingsByIdService extends BaseWarehouseService {
  async execute(
    warehouseId: string,
    query?: WarehouseRequestType["GetPackagingsById"]["Querystring"]
  ): Promise<{ packagings: PackagingAtWarehouse[]; metadata: Metadata }> {
    const logService = this.log.child({
      service: "FindPackagingById.execute",
      source: "database",
      operation: "db.transaction",
    });
    const cte = `
      WITH packagings AS (
        SELECT
          p.*,
          pi.quantity
        FROM
          packaging_inventory pi
          LEFT JOIN packagings p ON (pi.packaging_id = p.id)
        WHERE
          pi.warehouse_id = $1
          AND p.status = 'ACTIVE'
          AND p.deactived_at IS NULL
      )
    `;

    const baseSelect = `FROM packagings`;

    const where: string[] = [];
    const values: (string | number)[] = [warehouseId];
    let idx = 2;

    if (query) {
      if (query.name !== undefined) {
        where.push(`name ILIKE $${idx}::text`);
        values.push(`%${query.name.trim()}%`);
        idx++;
      }

      if (query.unit !== undefined) {
        where.push(`unit = $${idx}::text`);
        values.push(query.unit);
        idx++;
      }

      if (query.status !== undefined) {
        where.push(`status = $${idx}::text`);
        values.push(query.status);
        idx++;

        // thêm điều kiện deactivated
        if (query.status === "ACTIVE") {
          where.push(`deactived_at IS NULL`);
        } else {
          where.push(`deactived_at IS NOT NULL`);
        }
      }

      if (query.created_from) {
        where.push(`created_at >= $${idx}::timestamptz`);
        values.push(query.created_from);
        idx++;
      }

      if (query.created_to) {
        where.push(`created_at <= $${idx}::timestamptz`);
        values.push(query.created_to);
        idx++;
      }
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    let queryConfig: QueryConfig = {
      text: `
        ${cte}
        SELECT COUNT(*)::int AS count
        ${baseSelect}
        ${whereClause}
      `,
      values: [...values],
    };
    let client: PoolClient | null = null;
    let step: number = 0;
    let maxStep: number = 2;

    let result: { packagings: PackagingAtWarehouse[]; metadata: Metadata } = {
      packagings: [],
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
        const orderByClause = buildOrderBy(sortFieldMap, query?.sort);

        const limit = query?.limit ?? totalItem;
        const page = query?.page ?? 1;
        const offset = (page - 1) * limit;

        queryConfig = {
          text: `
          ${cte}
          SELECT *
          ${baseSelect}
          ${whereClause}
          ${orderByClause}
          LIMIT $${idx++}::int OFFSET $${idx}::int
        `,
          values: [...values, limit, offset],
        };

        const { rows: packagings } = await client.query<PackagingAtWarehouse>(
          queryConfig
        );

        logService.info(
          {
            step: `${++step}/${maxStep}`,
            stepOperation: "db.select",
            queryConfig,
          },
          `[${step}/${maxStep}] Truy vấn với sắp xếp và phân trang thành công.`
        );

        const totalPage = Math.ceil(totalItem / limit);

        result = {
          packagings,
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
      logService.info(`[${step}/${maxStep}] Commit thành công.`);

      return result;
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
        `[${step}/${maxStep}] Lỗi khi truy vấn bao bì của warehouseId=${warehouseId} trong database.`
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
