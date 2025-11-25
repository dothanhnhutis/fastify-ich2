import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import authRoutes from "./auth";
import fileRoutes from "./file";
import roleRoutes from "./role";
import sessionRoutes from "./session";
import userRoutes from "./user";
import warehouseRoutes from "./warehouse";

export default async function appRoutes(fastify: FastifyInstance) {
  fastify.get("/health", (_: FastifyRequest, reply: FastifyReply) => {
    reply.code(200).send({
      status: "ok",
      environment: "development",
    });
  });
  fastify.register(authRoutes);
  fastify.register(sessionRoutes);
  fastify.register(userRoutes);
  fastify.register(roleRoutes);
  fastify.register(fileRoutes);
  fastify.register(warehouseRoutes);
}
