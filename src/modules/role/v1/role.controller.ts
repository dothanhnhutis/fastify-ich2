import { BadRequestError } from "@shared/utils/error-handler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { RoleRequestType } from "./role.schema";

export const RoleController = {
  async getUsersById(
    req: FastifyRequest<RoleRequestType["GetUsersById"]>,
    reply: FastifyReply
  ) {
    const data = await req.services.role.v1.findUsersById(
      req.params.id,
      req.query
    );

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có ${data.metadata.totalItem} kết quả`,
      data,
    });
  },

  async getDetailById(
    req: FastifyRequest<RoleRequestType["GetDetailById"]>,
    reply: FastifyReply
  ) {
    const role = await req.services.role.v1.findDetailById(req.params.id);
    if (!role) throw new BadRequestError("Vai trò không tồn tại.");

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có 1 kết quả`,
      data: role,
    });
  },

  async getById(
    req: FastifyRequest<RoleRequestType["GetById"]>,
    reply: FastifyReply
  ) {
    const role = await req.services.role.v1.findById(req.params.id);
    if (!role) throw new BadRequestError("Vai trò không tồn tại.");

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có 1 kết quả`,
      data: role,
    });
  },

  async query(
    req: FastifyRequest<RoleRequestType["Query"]>,
    reply: FastifyReply
  ) {
    const data = await req.services.role.v1.findMany(req.query);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có ${data.metadata.totalItem} kết quả`,
      data,
    });
  },

  async create(
    req: FastifyRequest<RoleRequestType["Create"]>,
    reply: FastifyReply
  ) {
    if (req.body.userIds.length > 0) {
      const {
        users,
        metadata: { totalItem },
      } = await req.services.user.v1.findMany({
        id: req.body.userIds,
      });
      if (totalItem !== req.body.userIds.length) {
        const invalidId = req.body.userIds.filter(
          (id) => !users.map(({ id }) => id).includes(id)
        );
        throw new BadRequestError(
          `Tài khoản id=${invalidId[0]} không tồn tại.`
        );
      }
    }
    const role = await req.services.role.v1.create(req.body);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Tạo vai trò thành công.",
      data: role,
    });
  },

  async updateById(
    req: FastifyRequest<RoleRequestType["UpdateById"]>,
    reply: FastifyReply
  ) {
    const role = await req.services.role.v1.findDetailById(req.params.id);
    if (!role) throw new BadRequestError("Vai trò không tồn tại.");
    if (!role.can_update)
      throw new BadRequestError("Vai trò không được chỉnh sửa.");
    if (req.body.userIds && req.body.userIds.length > 0) {
      const {
        users,
        metadata: { totalItem },
      } = await req.services.user.v1.findMany({
        id: req.body.userIds,
      });

      if (totalItem !== req.body.userIds.length) {
        const invalidId = req.body.userIds.filter(
          (id) => !users.map(({ id }) => id).includes(id)
        );
        throw new BadRequestError(
          `Tài khoản id=${invalidId[0]} không tồn tại.`
        );
      }
    }
    await req.services.role.v1.updateById(role.id, req.body);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật vai trò thành công.",
    });
  },

  async deleteById(
    req: FastifyRequest<RoleRequestType["DeletaById"]>,
    reply: FastifyReply
  ) {
    const role = await req.services.role.v1.findById(req.params.id);
    if (!role) throw new BadRequestError("Vai trò không tồn tại.");
    if (!role.can_delete) throw new BadRequestError("Vai trò không được xoá.");
    await req.services.role.v1.deleteById(role.id);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Xoá vai trò thành công.",
    });
  },
};
