import { BaseService } from "@shared/base-service";
import type { FastifyRequest } from "fastify";

export default class BasePackagingService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "packaging", version: "v1" });
  }
}
