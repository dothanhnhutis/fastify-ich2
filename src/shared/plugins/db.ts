import { serviceHook } from "@shared/hooks/service";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { Pool, type PoolConfig } from "pg";

declare module "fastify" {
  interface FastifyRequest {
    pool: Pool;
  }
}

async function postgreSQLDB(fastify: FastifyInstance, options: PoolConfig) {
  const pool = new Pool(options);
  fastify.decorate("pool", pool);

  const healthCheck = async () => {
    try {
      await pool.query("SELECT 1 as health");
      fastify.log.info("PostgreSQL - Database connected successfully.");
    } catch (_: unknown) {
      fastify.log.info(`PostgreSQL - Database temporarily unavailable.`);
      process.exit(0);
    }
  };

  fastify.addHook("onReady", async () => {
    await healthCheck();
  });

  fastify.addHook("onRequest", async (request) => {
    request.pool = pool;
  });

  serviceHook(fastify);

  fastify.addHook("onClose", async () => {
    await pool.end();
    fastify.log.info("PostgreSQL - Database connections closed");
  });
}

export default fp(postgreSQLDB, {
  name: "postgreSQL-Plugin",
});
