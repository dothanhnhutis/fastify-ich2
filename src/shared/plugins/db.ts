import { PGDB } from "@shared/postgres";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { PoolConfig } from "pg";

declare module "fastify" {
  interface FastifyRequest {
    db: PGDB;
    services: {};
  }
}

async function postgreSQLDB(fastify: FastifyInstance, options: PoolConfig) {
  const db = new PGDB(options);

  fastify.addHook("onReady", async () => {
    const connected = await db.healthCheck();

    if (connected) {
      fastify.log.info("PostgreSQL - Database connected successfully.");
    } else {
      fastify.log.info(`PostgreSQL - Database temporarily unavailable.`);
      process.exit(0);
    }
  });

  fastify.decorateRequest("pool");
  fastify.decorateRequest("services");

  fastify.addHook("onRequest", async (request) => {
    request.db = db;
    request.services = {};
  });

  fastify.addHook("onClose", async () => {
    await db.end();
    fastify.log.info("PostgreSQL - Database connections closed");
  });
}

export default fp(postgreSQLDB, {
  name: "postgreSQL-Plugin",
});
