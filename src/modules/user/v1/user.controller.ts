import env from "@shared/config/env";
import { BadRequestError, PermissionError } from "@shared/utils/error-handler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { UserRequestType } from "./user.types";

// Admin
export const SuperUserController = {
  async query(
    request: FastifyRequest<UserRequestType["Query"]>,
    reply: FastifyReply
  ) {
    const data = await request.services.user.v1.findMany(request.query);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có ${data.metadata.totalItem} kết quả`,
      data,
    });
  },

  async getById(
    request: FastifyRequest<UserRequestType["GetById"]>,
    reply: FastifyReply
  ) {
    const existsUser = await request.services.user.v1.findWithoutPasswordById(
      request.params.id
    );
    if (!existsUser) throw new BadRequestError("Người dùng không tồn tại.");
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có 1 kết quả`,
      data: existsUser,
    });
  },

  async getRolesById(
    request: FastifyRequest<UserRequestType["GetRolesById"]>,
    reply: FastifyReply
  ) {
    const existsUser = await request.services.user.v1.findById(
      request.params.id
    );
    if (!existsUser) throw new BadRequestError("Người dùng không tồn tại.");
    const data = await request.services.user.v1.findRolesById(
      request.params.id,
      request.query
    );
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có ${data.metadata.totalItem} kết quả`,
      data,
    });
  },

  async getDetailById(
    request: FastifyRequest<UserRequestType["GetDetailById"]>,
    reply: FastifyReply
  ) {
    const userDetail =
      await request.services.user.v1.findDetailWithoutPasswordById(
        request.params.id
      );
    if (!userDetail) throw new BadRequestError("Người dùng không tồn tại.");
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có 1 kết quả`,
      data: userDetail,
    });
  },

  async create(
    request: FastifyRequest<UserRequestType["Create"]>,
    reply: FastifyReply
  ) {
    const existsUser = await request.services.user.v1.findByEmail(
      request.body.email
    );
    if (existsUser) throw new BadRequestError("Email đã tồn tại.");
    if (request.body.roleIds) {
      for (const id of request.body.roleIds) {
        const role = await request.services.role.v1.findById(id);
        if (!role)
          throw new BadRequestError(
            `Quyền truy cập roleId='${id}' không tồn tại.`
          );
      }
    }
    const { password_hash: _, ...userNoPass } =
      await request.services.user.v1.create(request.body);
    reply.code(StatusCodes.CREATED).send({
      statusCode: StatusCodes.OK,
      message: "Tạo người dùng thành công.",
      data: userNoPass,
    });
  },

  async updateById(
    request: FastifyRequest<UserRequestType["UpdateById"]>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const existsUser = await request.services.user.v1.findById(id);
    if (!existsUser) throw new BadRequestError("Email đã tồn tại.");

    if (request.body.roleIds && request.body.roleIds.length > 0) {
      const {
        roles,
        metadata: { totalItem },
      } = await request.services.role.v1.findMany({
        id: request.body.roleIds,
      });

      if (totalItem !== request.body.roleIds.length) {
        const invalidId = request.body.roleIds.filter(
          (id) => !roles.map(({ id }) => id).includes(id)
        );
        throw new BadRequestError(
          `Mã vai trò roleId=${invalidId[0]} không tồn tại.`
        );
      }
    }

    await request.services.user.v1.updateById(id, request.body);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật người dùng thành công.",
    });
  },
};
// User
export const UserController = {
  async me(request: FastifyRequest, reply: FastifyReply) {
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Thông tin tài khoản.",
      data: request.currUser,
    });
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    if (request.session) {
      await request.services.session.v1.delete(request.session);
    }
    reply.code(StatusCodes.OK).clearCookie(env.SESSION_KEY_NAME).send({
      statusCode: StatusCodes.OK,
      message: "Đăng xuất thành công",
    });
  },

  async update(
    request: FastifyRequest<UserRequestType["Update"]>,
    reply: FastifyReply
  ) {
    if (!request.currUser) throw new PermissionError();

    await request.services.user.v1.updateById(
      request.currUser.id,
      request.body
    );

    return reply.send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật thông tin người dùng thành công.",
    });
  },

  async uploadAvatar(request: FastifyRequest, reply: FastifyReply) {
    if (!request.currUser) throw new PermissionError();

    if (
      !request.multerField ||
      !request.multerField.avatar ||
      !Array.isArray(request.multerField.avatar)
    ) {
      throw new BadRequestError("Không có file nào tải lên.");
    }
    const file = request.multerField.avatar[0];
    await request.services.user.v1.updateAvatarById(request.currUser.id, file);
    return reply.send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật avatar thành công.",
    });
  },

  async deleteAvatar(request: FastifyRequest, reply: FastifyReply) {
    if (!request.currUser) throw new PermissionError();
    await request.services.user.v1.deleteAvatarById(request.currUser.id);
    return reply.send({
      statusCode: StatusCodes.OK,
      message: "Xoá avatar thành công.",
    });
  },
};
