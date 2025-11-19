import type { Channel } from "amqplib";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import type { Bindings } from "pino";
import type RedisCustom from "./redis-custom";

export default class BaseUserService {
  protected log: FastifyBaseLogger;
  protected redis: RedisCustom;
  protected pool: Pool;
  protected channel: Channel;

  constructor(fastify: FastifyRequest, logBindings: Bindings) {
    this.redis = fastify.redis;
    this.pool = fastify.pool;
    this.log = fastify.log.child({
      module: "user",
      version: "v1",
    });
    this.channel = fastify.getChannel("publish-user-channel");
  }
}
