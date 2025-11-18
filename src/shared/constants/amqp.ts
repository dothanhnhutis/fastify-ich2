import env from "@shared/config/env";
import type { AMQPOptions } from "@shared/rabbitmq";

export const amqpOptions: AMQPOptions = {
  server: {
    username: env.RABBITMQ_USERNAME,
    password: env.RABBITMQ_PASSWORD,
    hostname: env.RABBITMQ_HOSTNAME,
    port: env.RABBITMQ_PORT,
    vhost: env.RABBITMQ_VHOST,
    frameMax: env.RABBITMQ_FRAME_MAX,
  },
  connections: [
    {
      name: "publisher-conn",
      channels: [
        {
          name: "publish-user-channel",
        },
      ],
      maxRetries: 10,
      retryDelay: 5000,
      clientProperties: {
        connection_name: "publisher-conn",
        purpose: "publisher",
      },
    },
    {
      name: "consumer-conn",
      channels: [
        {
          name: "consume-user-channel",
        },
      ],
      maxRetries: 10,
      retryDelay: 5000,
      clientProperties: {
        connection_name: "consumer-conn",
        purpose: "consumer",
      },
    },
  ],
  exchanges: [
    {
      name: "user-mail-direct",
      type: "direct",
      options: {
        durable: true,
      },
    },
  ],
  queues: [
    {
      type: "direct",
      name: "create-new-user-mail-queue",
      exchange: "user-mail-direct",
      routingKey: "create-new-user",
      options: { durable: true },
    },
  ],
};
