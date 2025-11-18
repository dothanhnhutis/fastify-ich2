import type { RedisCache } from "@shared/plugins/redis";
import type { PGDB } from "@shared/postgres";
import type AMQP from "@shared/rabbitmq";
import type { FastifyBaseLogger, FastifyRequest } from "fastify";
import type { Bindings } from "pino";

class BaseService {
  protected log: FastifyBaseLogger;
  protected db: PGDB;
  protected redis: RedisCache;
  protected amqp: AMQP;

  constructor(fastify: FastifyRequest, logBindings?: Bindings) {
    this.log = fastify.log.child(logBindings ?? {});
    this.db = fastify.db;
    this.redis = fastify.redis;
    this.amqp = fastify.amqp;
  }
}

class UserService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "user", version: "v1" });
  }

  async test() {
    // custom amqp connect
    await this.amqp.createConnect({
      name: "connect-test",
      channels: [
        {
          name: "test-channel",
        },
      ],
      maxRetries: 10,
      retryDelay: 5000,
      clientProperties: {
        connection_name: "publisher-conn",
        purpose: "publisher",
      },
    });

    // const channel = this.amqp.getChannel("test-channel");

    //  await channel.assertExchange(
    //     exchange.name,
    //     exchange.type,
    //     exchange.options
    //   );

    // await channel.assertQueue("", {
    //   exclusive: true,
    // });
  }
}
