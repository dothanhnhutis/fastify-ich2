import type { MulterFile } from "@shared/middleware/multer";
import type { FastifyRequest } from "fastify";
import type { PackagingRequestType } from "../packaging.types";
import CreateService from "./create.service";
import DeleteByIdService from "./deleteById.service";
import FindByIdService from "./findById.service";
import FindDetailByIdService from "./findDetailById.service";
import FindManyService from "./findMany.service";
import { FindWarehousesByIdService } from "./findWarehousesById.service";
import UpdateByIdService from "./updateById.service";
import UpdateImageByIdService from "./updateImageById.service";

export default class PackagingServiceV1 {
  private createService: CreateService;
  private findByIdService: FindByIdService;
  private findDetailByIdService: FindDetailByIdService;
  private findManyService: FindManyService;
  private findWarehousesByIdService: FindWarehousesByIdService;
  private updateByIdService: UpdateByIdService;
  private updateImageByIdService: UpdateImageByIdService;

  private deleteByIdService: DeleteByIdService;

  constructor(fastify: FastifyRequest) {
    this.createService = new CreateService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findDetailByIdService = new FindDetailByIdService(fastify);
    this.findManyService = new FindManyService(fastify);
    this.findWarehousesByIdService = new FindWarehousesByIdService(fastify);
    this.updateByIdService = new UpdateByIdService(fastify);
    this.updateImageByIdService = new UpdateImageByIdService(fastify);
    this.deleteByIdService = new DeleteByIdService(fastify);
  }

  async create(data: PackagingRequestType["Create"]["Body"]) {
    return await this.createService.execute(data);
  }

  async findById(packagingId: string) {
    return await this.findByIdService.execute(packagingId);
  }

  async findDetailById(packagingId: string) {
    return await this.findDetailByIdService.execute(packagingId);
  }

  async findMany(query: PackagingRequestType["Query"]["Querystring"]) {
    return await this.findManyService.execute(query);
  }

  async findWarehousesById(
    packagingId: string,
    query?: PackagingRequestType["GetWarehousesById"]["Querystring"]
  ) {
    return await this.findWarehousesByIdService.execute(packagingId, query);
  }

  async updateById(
    packagingId: string,
    data: PackagingRequestType["UpdateById"]["Body"]
  ) {
    return this.updateByIdService.execute(packagingId, data);
  }

  async updateImageById(packagingId: string, file: MulterFile, userId: string) {
    return this.updateImageByIdService.execute(packagingId, file, userId);
  }

  async deleteById(packagingId: string) {
    return await this.deleteByIdService.execute(packagingId);
  }
}
