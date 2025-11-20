import AMQP, { type AMQPOptions } from "@shared/rabbitmq";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    amqp: AMQP;
  }
  interface FastifyRequest {
    amqp: AMQP;
  }
}

async function AMQPPlugin(fastify: FastifyInstance, options: AMQPOptions) {
  const amqp = new AMQP(options);

  fastify.decorate("amqp");
  fastify.decorateRequest("amqp");

  fastify.addHook("onReady", async () => {
    try {
      await amqp.connect();
      fastify.log.error("RabbitMQ - Connection success.");

      fastify.amqp = amqp;
    } catch (error: unknown) {
      fastify.log.error({ error }, "RabbitMQ - Connection error.");
      process.exit(0);
    }
  });

  fastify.addHook("onRequest", async (request) => {
    request.amqp = amqp;
  });

  fastify.addHook("onClose", async () => {
    await amqp.closeAll();
  });
}

export default fp(AMQPPlugin, {
  name: "AMQP-Plugin",
});
