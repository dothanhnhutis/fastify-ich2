import type { FastifyRequest } from "fastify";
import type { PackagingRequestType } from "../packaging.types";
import CreateService from "./create.service";
import FindByIdService from "./findById.service";
import FindDetailByIdService from "./findDetailById.service";
import FindManyService from "./findMany.service";
import { FindWarehousesByIdService } from "./findWarehousesById.service";

export default class PackagingServiceV1 {
  private createService: CreateService;
  private findByIdService: FindByIdService;
  private findDetailByIdService: FindDetailByIdService;
  private findManyService: FindManyService;
  private findWarehousesByIdService: FindWarehousesByIdService;
  private updateByIdService: UpdateByIdService;
  private deleteByIdService: DeleteByIdService;

  constructor(fastify: FastifyRequest) {
    this.createService = new CreateService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findDetailByIdService = new FindDetailByIdService(fastify);
    this.findManyService = new FindManyService(fastify);
    this.findWarehousesByIdService = new FindWarehousesByIdService(fastify);
    this.updateByIdService = new UpdateByIdService(fastify);
    this.deleteByIdService = new DeleteByIdService(fastify);
  }

  async create(data: PackagingRequestType["Create"]["Body"]) {
    return await this.createService.execute(data);
  }

  async findById(warehouseId: string) {
    return await this.findByIdService.execute(warehouseId);
  }

  async findDetailById(warehouseId: string) {
    return await this.findDetailByIdService.execute(warehouseId);
  }

  async findMany(query: PackagingRequestType["Query"]["Querystring"]) {
    return await this.findManyService.execute(query);
  }

  async findPackagingsById(
    warehouseId: string,
    query?: PackagingRequestType["GetWarehousesById"]["Querystring"]
  ) {
    return await this.findWarehousesByIdService.execute(warehouseId, query);
  }

  async updateById(
    warehouseId: string,
    data: PackagingRequestType["UpdateById"]["Body"]
  ) {
    return this.updateByIdService.execute(warehouseId, data);
  }

  async deleteById(warehouseId: string) {
    return await this.deleteByIdService.execute(warehouseId);
  }
}
