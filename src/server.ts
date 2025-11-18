import { randomUUID } from "node:crypto";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import cookie from "@shared/plugins/cookie";
import db from "@shared/plugins/db";
import redis from "@shared/plugins/redis";
import { errorHandler } from "@shared/utils/error-handler";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import env from "./shared/config/env";
import { loggerConfig, loggerHook } from "./shared/hooks/logger";

export async function buildServer() {
  const server = Fastify({
    logger: loggerConfig,
    trustProxy: true,
    genReqId: () => randomUUID(),
  });

  // zod validate
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);
  server.withTypeProvider<ZodTypeProvider>();

  // Plugins
  server.register(fastifyHelmet);
  server.register(fastifyCors, {
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  });
  server.register(cookie, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
  });

  await server
    .register(redis, { host: env.REDIS_HOST, port: env.REDIS_PORT })
    .register(db, {
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 60_000,
      connectionTimeoutMillis: 500,
      maxLifetimeSeconds: 300,
    });

  // Hook
  loggerHook(server);

  // Error handling
  server.setErrorHandler(errorHandler);

  return server;
}
