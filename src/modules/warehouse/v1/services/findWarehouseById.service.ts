import type { QueryConfig } from "pg";
import type { WarehouseRequestType } from "../warehouse.schema";
import BaseWarehouseService from "./base.service";

export class FindPackagingById extends BaseWarehouseService {
  async execute(
    warehouseId: string,
    query?: WarehouseRequestType["GetPackagingsById"]["Querystring"]
  ) {
    const newTable = `
       WITH 
        packagings AS (
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
    const queryString = [`SELECT * FROM packagings`];
    const values: (string | number)[] = [warehouseId];
    const where: string[] = [];
    let idx = 2;

    if (query) {
      if (query.name !== undefined) {
        where.push(`name ILIKE $${idx++}::text`);
        values.push(`%${query.name.trim()}%`);
      }

      if (query.unit !== undefined) {
        where.push(`unit = $${idx++}::text`);
        values.push(query.unit);
      }

      if (query.status !== undefined) {
        where.push(
          `status = $${idx++}::text`,
          query.status === "ACTIVE"
            ? "deactived_at IS NULL"
            : "deactived_at IS NOT NULL"
        );
        values.push(query.status);
      }

      if (query.created_from) {
        where.push(`created_at >= $${idx++}::timestamptz`);
        values.push(query.created_from);
      }

      if (query.created_to) {
        where.push(`created_at <= $${idx++}::timestamptz`);
        values.push(query.created_to);
      }
    }

    if (where.length > 0) {
      queryString.push(`WHERE ${where.join(" AND ")}`);
    }

    let queryConfig: QueryConfig = {
      text: [newTable, queryString.join(" ").replace("*", "count(*)")].join(
        " "
      ),
      values,
    };
    try {
      return await this.fastify.transaction(async (client) => {
        const { rows } = await client.query<{ count: string }>(queryConfig);
        const totalItem = parseInt(rows[0].count, 10);

        if (query?.sort !== undefined) {
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

        const limit = query?.limit ?? totalItem;
        const page = query?.page ?? 1;
        const offset = (page - 1) * limit;

        queryString.push(`LIMIT $${idx++}::int OFFSET $${idx}::int`);
        values.push(limit, offset);

        queryConfig = {
          text: [newTable, queryString.join(" ")].join(" "),
          values,
        };

        const { rows: packagings } = await this.fastify.query<
          WarehouseDetail["packagings"][number]
        >(queryConfig);

        const totalPage = Math.ceil(totalItem / limit) || 0;

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
      throw new BadRequestError(
        `PackagingRepo.findPackagingsByWarehouseId() method error: ${error}`
      );
    }
  }
}
