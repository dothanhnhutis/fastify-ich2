import type { Metadata } from "@modules/shared/types";
import { InternalServerError } from "@shared/utils/error-handler";
import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import type { Warehouse } from "../warehouse.types";
import BaseWarehouseService from "./base.service";

export default class FindManyService extends BaseWarehouseService {
  async execute(
    query: WarehouseRequestType["Query"]["Querystring"]
  ): Promise<{ warehouses: Warehouse[]; metadata: Metadata }> {
    const queryString = [
      `
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
          `,
    ];
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
        query.deleted ? `disabled_at IS NOT NULL` : `disabled_at IS NULL`
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

    if (where.length > 0) {
      queryString.push(`WHERE ${where.join(" AND ")}`);
    }

    queryString.push("GROUP BY w.id");

    const logService = this.log.child({
      service: "CreateService.execute",
      source: "database",
    });

    let queryConfig: QueryConfig = {
      text: `WITH warehouses AS (${queryString.join(
        " "
      )}) SELECT  COUNT(*)::int AS count FROM warehouses;`,
      values,
    };

    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const { rows } = await client.query<{ count: string }>({
        text: `WITH warehouses AS (${queryString.join(
          " "
        )}) SELECT  COUNT(*)::int AS count FROM warehouses;`,
        values,
      });

      logService.info(
        {
          step: "1/2",
          stepOperation: "db.select",
          queryConfig,
        },
        `Có ${rows[0].count} kết quả.`
      );

      const totalItem = parseInt(rows[0].count, 10);

      if (query.sort !== undefined) {
        const unqueField = query.sort.reduce<Record<string, string>>(
          (prev, curr) => {
            const [field, direction] = curr.split(".");
            prev[field] = direction.toUpperCase();
            return prev;
          },
          {}
        );

        const orderBy = Object.entries(unqueField)
          .map(([field, direction]) => `${field} ${direction}`)
          .join(", ");

        queryString.push(`ORDER BY ${orderBy}`);
      }

      const limit = query.limit ?? totalItem;
      const page = query.page ?? 1;
      const offset = (page - 1) * limit;

      queryString.push(`LIMIT $${idx++}::int OFFSET $${idx}::int`);
      values.push(limit, offset);

      queryConfig = {
        text: queryString.join(" "),
        values,
      };

      const { rows: warehouses } = await client.query<Warehouse>(queryConfig);
      logService.info(
        {
          step: "2/2",
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
