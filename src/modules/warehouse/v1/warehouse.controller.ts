import { BadRequestError } from "@shared/utils/error-handler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { WarehouseRequestType } from "./warehouse.types";

export const WarehouseController = {
  async query(
    req: FastifyRequest<WarehouseRequestType["Query"]>,
    reply: FastifyReply
  ) {
    const data = await req.services.warehouse.v1.findMany(req.query);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      data,
    });
  },

  async getById(
    req: FastifyRequest<WarehouseRequestType["GetById"]>,
    reply: FastifyReply
  ) {
    const warehouse = await req.services.warehouse.v1.findById(req.params.id);
    if (!warehouse) throw new BadRequestError("Nhà kho không tồn tại.");
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      data: warehouse,
    });
  },

  async getPackagingsById(
    req: FastifyRequest<WarehouseRequestType["GetPackagingsById"]>,
    reply: FastifyReply
  ) {
    const warehouse = await req.services.warehouse.v1.findById(req.params.id);
    if (!warehouse) throw new BadRequestError("Nhà kho không tồn tại.");
    const detail = await req.services.warehouse.v1.findPackagingsById(
      req.params.id,
      req.query
    );
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: `Có ${detail.metadata.totalItem} kết quả`,
      data: detail,
    });
  },

  async getDetailById(
    req: FastifyRequest<WarehouseRequestType["GetDetailById"]>,
    reply: FastifyReply
  ) {
    const detail = await req.services.warehouse.v1.findDetailById(
      req.params.id
    );
    if (!detail) throw new BadRequestError("Nhà kho không tồn tại.");
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      packagings: detail,
    });
  },

  async create(
    req: FastifyRequest<WarehouseRequestType["Create"]>,
    reply: FastifyReply
  ) {
    // if (req.body.packagingIds) {
    //   for (const packagingId of req.body.packagingIds) {
    //     const existsPackaging = await req.services.warehouse.v1.findPackagingById(
    //       packagingId
    //     );
    //     if (!existsPackaging)
    //       throw new BadRequestError(
    //         `Mã bao bì id=${packagingId} không tồn tại`
    //       );
    //   }
    // }
    const role = await req.services.warehouse.v1.create(req.body);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      data: {
        message: "Tạo nhà kho thành công.",
        role,
      },
    });
  },

  async updateById(
    req: FastifyRequest<WarehouseRequestType["UpdateById"]>,
    reply: FastifyReply
  ) {
    const warehouse = await req.services.warehouse.v1.findById(req.params.id);
    if (!warehouse) throw new BadRequestError("Nhà kho không tồn tại.");

    // if (req.body.packagingIds) {
    //   for (const packagingId of req.body.packagingIds) {
    //     const existsPackaging =
    //       await req.services.warehouse.v1.findPackagingById(packagingId);
    //     if (!existsPackaging)
    //       throw new BadRequestError(
    //         `Mã bao bì id=${packagingId} không tồn tại`
    //       );
    //   }
    // }

    await req.services.warehouse.v1.updateById(warehouse.id, req.body);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      data: {
        message: "Cập nhật nhà kho thành công.",
      },
    });
  },

  async deleteById(
    req: FastifyRequest<WarehouseRequestType["DeleteById"]>,
    reply: FastifyReply
  ) {
    const warehouse = await req.services.warehouse.v1.findById(req.params.id);
    if (!warehouse) throw new BadRequestError("Nhà kho không tồn tại.");

    await req.services.warehouse.v1.deleteById(warehouse.id);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      statusText: "OK",
      data: {
        message: "Xoá nhà kho thành công.",
      },
    });
  },
};
