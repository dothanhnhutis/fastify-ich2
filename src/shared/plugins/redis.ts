import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import Redis, { type RedisOptions } from "ioredis";

export class RedisCache extends Redis {
  constructor(options: Omit<RedisOptions, "lazyConnect" | "retryStrategy">) {
    super({ ...options, lazyConnect: true, retryStrategy: () => null });
  }
}

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisCache;
  }
  interface FastifyRequest {
    redis: RedisCache;
  }
}

async function redisCache(
  fastify: FastifyInstance,
  options: Omit<RedisOptions, "lazyConnect" | "retryStrategy">
) {
  let isConnected = false,
    reconnectAttempts = 0;
  const reconnectInterval = 5000;

  let redis = new RedisCache({
    ...options,
  });

  // Hàm để cập nhật client reference
  function updateRedisClient(newClient: RedisCache) {
    redis = newClient;
    // Cập nhật lại decorator
    fastify.redis = newClient;
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function reconnect(): Promise<void> {
    while (!isConnected) {
      fastify.log.warn(`Redis - Đang cố gắng kết nối lại với bộ nhớ đệm...`);
      try {
        // Disconnect client cũ nếu chưa disconnect
        if (redis && redis.status !== "end") {
          redis.disconnect();
        }

        const newRedisClient = new RedisCache({
          ...options,
        });

        await newRedisClient.connect();
        fastify.log.info("Redis - Kết nối với bộ nhớ đệm thành công.");

        // Cập nhật client reference
        updateRedisClient(newRedisClient);

        newRedisClient.on("error", (err) => {
          fastify.log.error(err, "Redis - Truy vấn thất bại.");
        });

        newRedisClient.on("close", async () => {
          fastify.log.warn("Redis - Kêt nối với bộ nhớ đệm đã đóng.");
          isConnected = false;
          await reconnect();
        });

        isConnected = true;
        reconnectAttempts = 0;
        break;
      } catch (error) {
        reconnectAttempts++;
        fastify.log.error(
          error,
          `Redis - Nỗ lực kết nối lại lần ${reconnectAttempts} không thành công.`
        );
        await sleep(reconnectInterval);
      }
    }
  }

  fastify.decorateRequest("redis");
  fastify.decorate("redis", redis);

  fastify.addHook("onReady", async () => {
    try {
      await redis.connect();
      fastify.log.info("Redis - Kết nối với bộ nhớ đệm thành công.");

      redis.on("error", (err) => {
        fastify.log.error(err, "Redis - Truy vấn thất bại.");
      });

      redis.on("close", async () => {
        fastify.log.warn("Redis - Kêt nối với bộ nhớ đệm đã đóng.");
        isConnected = false;
        await reconnect();
      });
    } catch (error: unknown) {
      fastify.log.error(error, "Redis - Kêt nối với bộ nhớ đệm thất bại.");
      process.exit(0);
    }
  });

  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    request.redis = redis;
  });

  fastify.addHook("onClose", async () => {
    console.log("Closing Redis connection");
  });
}

export default fp(redisCache, {
  name: "redis-plugin",
});
