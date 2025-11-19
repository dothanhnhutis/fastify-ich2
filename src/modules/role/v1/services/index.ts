import type { FastifyRequest } from "fastify";
import type { RoleRequestType } from "../role.schema";
import CreateService from "./create.service";
import DeleteByIdService from "./deleteById.service";
import FindByIdService from "./findById.service";
import FindDetailByIdService from "./findDetailById.service";
import FindManyService from "./findMany.service";
import FindUsersByIdService from "./findUsersById.service";
import UpdateByIdService from "./updateById.service";

export default class RoleServiceV1 {
  private createService: CreateService;
  private findByIdService: FindByIdService;
  private findDetailByIdService: FindDetailByIdService;
  private findManyService: FindManyService;
  private findUsersByIdService: FindUsersByIdService;
  private updateByIdService: UpdateByIdService;
  private deleteByIdService: DeleteByIdService;

  constructor(fastify: FastifyRequest) {
    this.createService = new CreateService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findDetailByIdService = new FindDetailByIdService(fastify);
    this.findManyService = new FindManyService(fastify);
    this.findUsersByIdService = new FindUsersByIdService(fastify);
    this.updateByIdService = new UpdateByIdService(fastify);
    this.deleteByIdService = new DeleteByIdService(fastify);
  }

  async create(data: RoleRequestType["Create"]["Body"]) {
    return await this.createService.execute(data);
  }
  async findById(roleId: string) {
    return await this.findByIdService.execute(roleId);
  }
  async findDetailById(email: string) {
    return await this.findDetailByIdService.execute(email);
  }
  async findMany(query: RoleRequestType["Query"]["Querystring"]) {
    return await this.findManyService.execute(query);
  }

  async findUsersById(
    roleId: string,
    query?: RoleRequestType["GetUsersById"]["Querystring"]
  ) {
    return await this.findUsersByIdService.execute(roleId, query);
  }

  async updateById(
    userId: string,
    data: RoleRequestType["UpdateById"]["Body"]
  ) {
    return this.updateByIdService.execute(userId, data);
  }

  async deleteById(roleId: string) {
    return await this.deleteByIdService.execute(roleId);
  }
}
