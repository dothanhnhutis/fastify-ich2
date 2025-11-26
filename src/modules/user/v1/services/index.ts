import type { MulterFile } from "@shared/middleware/multer";
import type { FastifyRequest } from "fastify";
import type { UserRequestType } from "../user.types";
import CreateService from "./create.service";
import DeleteAvatarByIdService from "./deleteAvatarById.service";
import FindByEmailService from "./findByEmail.service";
import FindByIdService from "./findById.service";
import FindDetailByIdService from "./findDetailById.service";
import FindManyService from "./findMany.service";
import FindRoleByIdService from "./findRolesById.service";
import FindWithoutPasswordByEmailService from "./findWithoutPasswordByEmail.service";
import FindWithoutPasswordByIdService from "./findWithoutPasswordById.service";
import UpdateAvatarByIdService from "./updateAvatarById.service";
import UpdateByIdService from "./updateById.service";

/**
 * User Service - Aggregate tất cả các service methods
 */
export default class UserServiceV1 {
  private createService: CreateService;
  private findByIdService: FindByIdService;
  private findWithoutPasswordByIdService: FindWithoutPasswordByIdService;
  private findByEmailService: FindByEmailService;
  private findWithoutPasswordByEmailService: FindWithoutPasswordByEmailService;
  private findDetailByIdService: FindDetailByIdService;
  private findManyService: FindManyService;
  private findRoleByIdService: FindRoleByIdService;

  private deleteAvatarByIdService: DeleteAvatarByIdService;
  private updateAvatarByIdService: UpdateAvatarByIdService;
  private updateByIdService: UpdateByIdService;

  constructor(fastify: FastifyRequest) {
    // Khởi tạo các service con
    this.createService = new CreateService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findWithoutPasswordByIdService = new FindWithoutPasswordByIdService(
      fastify
    );
    this.findByEmailService = new FindByEmailService(fastify);
    this.findWithoutPasswordByEmailService =
      new FindWithoutPasswordByEmailService(fastify);
    this.findDetailByIdService = new FindDetailByIdService(fastify);
    this.findManyService = new FindManyService(fastify);
    this.findRoleByIdService = new FindRoleByIdService(fastify);
    this.deleteAvatarByIdService = new DeleteAvatarByIdService(fastify);
    this.updateAvatarByIdService = new UpdateAvatarByIdService(fastify);
    this.updateByIdService = new UpdateByIdService(fastify);
  }

  async findById(userId: string) {
    return await this.findByIdService.execute(userId);
  }
  async findWithoutPasswordById(userId: string) {
    return await this.findWithoutPasswordByIdService.execute(userId);
  }
  async findByEmail(email: string) {
    return await this.findByEmailService.execute(email);
  }
  async findWithoutPasswordByEmail(email: string) {
    return await this.findWithoutPasswordByEmailService.execute(email);
  }
  async findDetailById(email: string) {
    return await this.findDetailByIdService.execute(email);
  }
  async findMany(query: UserRequestType["Query"]["Querystring"]) {
    return await this.findManyService.execute(query);
  }

  async findRolesById(
    userId: string,
    query?: UserRequestType["GetRolesById"]["Querystring"]
  ) {
    return await this.findRoleByIdService.execute(userId, query);
  }

  async create(data: UserRequestType["Create"]["Body"]) {
    return await this.createService.execute(data);
  }

  async updateById(
    userId: string,
    data: UserRequestType["UpdateById"]["Body"]
  ) {
    return await this.updateByIdService.execute(userId, data);
  }

  async updateAvatarById(userId: string, file: MulterFile) {
    return await this.updateAvatarByIdService.execute(userId, file);
  }

  async deleteAvatarById(userId: string) {
    return await this.deleteAvatarByIdService.execute(userId);
  }
}
