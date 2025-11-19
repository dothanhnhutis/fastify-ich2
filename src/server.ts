import { randomUUID } from "node:crypto";
import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import { amqpOptions } from "@shared/constants/amqp";
import { AMQPHook } from "@shared/hooks/amqp";
import { serviceHook } from "@shared/hooks/service";
import amqp from "@shared/plugins/amqp";
import cookie from "@shared/plugins/cookie";
import db from "@shared/plugins/db";
import redis from "@shared/plugins/redis";
import session from "@shared/plugins/session";
import { errorHandler } from "@shared/utils/error-handler";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import appRoutes from "./modules";
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
    })
    .register(amqp, amqpOptions)
    .register(session, {
      secret: env.SESSION_SECRET_KEY,
      cookieName: env.SESSION_KEY_NAME,
      refreshCookie: true,
    });

  // Hook
  loggerHook(server);
  AMQPHook(server);

  // Routes
  server.register(appRoutes, { prefix: "/api" });

  // Error handling
  server.setErrorHandler(errorHandler);

  return server;
}
