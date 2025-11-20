import type { PoolClient, QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import BaseWarehouseService from "./base.service";

export class FindPackagingById extends BaseWarehouseService {
  async execute(
    warehouseId: string,
    query?: WarehouseRequestType["GetPackagingsById"]["Querystring"]
  ) {
    // CTE chung
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

    // base SELECT
    const baseSelect = `FROM packagings`;

    const where: string[] = [];
    const values: (string | number)[] = [warehouseId];
    let idx = 2;

    // -----------------------
    // Build WHERE
    // -----------------------
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

    // -----------------------
    // 1) Query đếm
    // -----------------------
    const countQuery: QueryConfig = {
      text: `
        ${cte}
        SELECT COUNT(*) AS count
        ${baseSelect}
        ${whereClause}
      `,
      values: [...values],
    };
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      return await this.db.transaction(async (client) => {
        const { rows } = await client.query<{ count: string }>(countQuery);
        const totalItem = parseInt(rows[0]?.count ?? "0", 10);

        // Nếu không có item nào thì khỏi query data
        if (!totalItem) {
          await client.query("COMMIT");
          return {
            packagings: [] as WarehouseDetail["packagings"],
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

        // -----------------------
        // 2) ORDER BY
        // -----------------------
        let orderByClause = "";
        if (query?.sort && query.sort.length > 0) {
          const uniqueField = query.sort.reduce<Record<string, string>>(
            (prev, curr) => {
              const [field, direction = "ASC"] = curr.split(".");
              // đơn giản, bạn có thể thêm whitelist field + direction ở đây
              prev[field] = direction.toUpperCase() === "DESC" ? "DESC" : "ASC";
              return prev;
            },
            {}
          );

          const orderBy = Object.entries(uniqueField)
            .map(([field, direction]) => `${field} ${direction}`)
            .join(", ");

          orderByClause = `ORDER BY ${orderBy}`;
        }

        // -----------------------
        // 3) LIMIT / OFFSET
        // -----------------------
        const limit = query?.limit ?? totalItem;
        const page = query?.page ?? 1;
        const offset = (page - 1) * limit;

        const valuesData = [...values, limit, offset];
        const limitIndex = idx;
        const offsetIndex = idx + 1;

        const dataQuery: QueryConfig = {
          text: `
            ${cte}
            SELECT *
            ${baseSelect}
            ${whereClause}
            ${orderByClause}
            LIMIT $${limitIndex}::int OFFSET $${offsetIndex}::int
          `,
          values: valuesData,
        };

        const { rows: packagings } = await client.query<
          WarehouseDetail["packagings"][number]
        >(dataQuery);

        const totalPage = Math.ceil(totalItem / limit) || 0;
        await client.query("COMMIT");

        return {
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
      });
    } catch (error: unknown) {
      if (client) {
        try {
          await client.query("ROLLBACK");
          logService.info("Rollback thành công.");
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
        `Lỗi khi truy vấn trong database.`
      );
      throw new InternalServerError();
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
