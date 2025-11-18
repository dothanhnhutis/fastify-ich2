import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryConfig,
  type QueryResult,
  type QueryResultRow,
} from "pg";

export class PGDB {
  private pool: Pool;
  constructor(public options: PoolConfig) {
    this.pool = new Pool(options);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1 as health");
      return true;
    } catch (_: unknown) {
      return false;
    }
  }

  // handle retry
  async query<R extends QueryResultRow, I = unknown[]>(
    queryConfig: QueryConfig<I>
  ): Promise<QueryResult<R>> {
    try {
      return await this.pool.query<R, I>(queryConfig);
    } catch (error: unknown) {
      // handle network error
      // handle pool error
      throw error;
    }
  }

  // handle retry
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    let client: PoolClient | null = null;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackErr) {
          console.log("Rollback failed:", rollbackErr);
        }
      }
      // handle network error
      // handle pool error
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async end(): Promise<void> {
    return await this.pool.end();
  }
}
