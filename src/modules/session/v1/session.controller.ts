import { BadRequestError, PermissionError } from "@shared/utils/error-handler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import BaseSessionService from "./services/base.service";
import type { SessionRequestType } from "./session.schema";

export const SessionController = {
  async getAll(request: FastifyRequest, reply: FastifyReply) {
    if (!request.currUser) throw new PermissionError();

    const data = await request.services.session.v1.findManyByUserId(
      request.currUser.id
    );

    reply.code(StatusCodes.OK).send({
      statusCodes: StatusCodes.OK,
      message: `Có ${data.length} kết quả`,
      data,
    });
  },

  async deleteById(
    request: FastifyRequest<SessionRequestType["DeleteById"]>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    if (!request.session) throw new PermissionError();

    if (request.session.id === id)
      throw new BadRequestError("Không thể xoá phiên hiện tại.");

    const session = await request.services.session.v1.findById(
      BaseSessionService.makeSessionId(request.session.userId, id)
    );

    if (!session) throw new BadRequestError("Phiên không tồn tại.");

    await request.services.session.v1.delete(session);

    reply.code(StatusCodes.OK).send({
      statusCodes: StatusCodes.OK,
      message: "Xoá phiên thành công",
    });
  },
};
