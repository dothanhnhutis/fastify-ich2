import type { FastifyRequest } from "fastify";
import CreateService from "./create.service";
import { WarehouseRequestType } from "../warehouse.schema";
import FindByIdService from "./findById.service";
import FindDetailByIdService from "./findDetailById.service";
import FindManyService from "./findMany.service";
import { FindPackagingsByIdService } from "./findPackagingsById.service";
import UpdateByIdService from "./update.service";
import DeleteByIdService from "./deleteById.service";

export default class WarehouseServiceV1 {
  private createService: CreateService;
  private findByIdService: FindByIdService;
  private findDetailByIdService: FindDetailByIdService;
  private findManyService: FindManyService;
  private findPackagingsByIdService: FindPackagingsByIdService;
  private updateByIdService: UpdateByIdService;
  private deleteByIdService: DeleteByIdService;

  constructor(fastify: FastifyRequest) {
    this.createService = new CreateService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findDetailByIdService = new FindDetailByIdService(fastify);
    this.findManyService = new FindManyService(fastify);
    this.findPackagingsByIdService = new FindPackagingsByIdService(fastify);
    this.updateByIdService = new UpdateByIdService(fastify);
    this.deleteByIdService = new DeleteByIdService(fastify);
  }

  async create(data: WarehouseRequestType["Create"]["Body"]) {
    return await this.createService.execute(data);
  }

  async findById(warehouseId: string) {
    return await this.findByIdService.execute(warehouseId);
  }

  async findDetailById(warehouseId: string) {
    return await this.findDetailByIdService.execute(warehouseId);
  }

  async findMany(query: WarehouseRequestType["Query"]["Querystring"]) {
    return await this.findManyService.execute(query);
  }

  async findPackagingsById(
    warehouseId: string,
    query?: WarehouseRequestType["GetPackagingsById"]["Querystring"]
  ) {
    return await this.findPackagingsByIdService.execute(warehouseId, query);
  }

  async updateById(
    warehouseId: string,
    data: WarehouseRequestType["UpdateById"]["Body"]
  ) {
    return this.updateByIdService.execute(warehouseId, data);
  }

  async deleteById(warehouseId: string) {
    return await this.deleteByIdService.execute(warehouseId);
  }
}
