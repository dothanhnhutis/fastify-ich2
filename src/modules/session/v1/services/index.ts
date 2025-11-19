import type { FastifyRequest } from "fastify";
import type { ReqInfo, Session } from "../session.types";
import CreateService from "./create.service";
import DeleteService from "./delete.service";
import FindByIdService from "./findById.service";
import FindManyByUserIdService from "./findManyByUserId.service";
import RefreshService from "./refresh.service";

export default class SessionServiceV1 {
  private createService: CreateService;
  private deleteService: DeleteService;
  private findByIdService: FindByIdService;
  private findManyByUserIdService: FindManyByUserIdService;
  private refreshService: RefreshService;

  constructor(fastify: FastifyRequest) {
    this.createService = new CreateService(fastify);
    this.deleteService = new DeleteService(fastify);
    this.findByIdService = new FindByIdService(fastify);
    this.findManyByUserIdService = new FindManyByUserIdService(fastify);
    this.refreshService = new RefreshService(fastify);
  }

  async create(data: ReqInfo) {
    return await this.createService.execute(data);
  }

  async delete(session: Session) {
    return await this.deleteService.execute(session);
  }

  async findById(sessionId: string) {
    return await this.findByIdService.execute(sessionId);
  }

  async findManyByUserId(sessionId: string) {
    return await this.findManyByUserIdService.execute(sessionId);
  }

  async refresh(oldSession: Session) {
    return await this.refreshService.execute(oldSession);
  }
}
