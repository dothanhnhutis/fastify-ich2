import { BaseService } from "@shared/base-service";
import type { FastifyRequest } from "fastify";

export default class BaseWarehouseService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "warehouse", version: "v1" });
  }
}
