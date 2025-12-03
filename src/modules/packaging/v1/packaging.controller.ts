import { BadRequestError } from "@shared/utils/error-handler";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { PackagingRequestType } from "./packaging.types";

export const PackagingController = {
  async query(
    req: FastifyRequest<PackagingRequestType["Query"]>,
    reply: FastifyReply
  ) {
    const data = await req.services.packaging.v1.findMany(req.query);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      mesage: `Có ${data.metadata.totalItem} kết quả.`,
      data,
    });
  },

  async getById(
    req: FastifyRequest<PackagingRequestType["GetById"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.findById(req.params.id);
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      mesage: `Có 1 kết quả.`,
      data: packaging,
    });
  },

  async getDetailById(
    req: FastifyRequest<PackagingRequestType["GetDetailById"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.findDetailById(
      req.params.id
    );
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      mesage: `Có 1 kết quả.`,
      data: packaging,
    });
  },

  async getWarehousesById(
    req: FastifyRequest<PackagingRequestType["GetWarehousesById"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.findById(req.params.id);
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");
    const data = await req.services.packaging.v1.findWarehousesById(
      req.params.id,
      req.query
    );
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      mesage: `Có 1 kết quả.`,
      data,
    });
  },

  async create(
    req: FastifyRequest<PackagingRequestType["Create"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.create(req.body);

    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Tạo bao bì thành công.",
      data: packaging,
    });
  },

  async updateById(
    req: FastifyRequest<PackagingRequestType["UpdateById"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.findById(req.params.id);
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");

    const unit = req.body.unit || packaging.unit;
    const pcs_ctn =
      unit === "PIECE" ? null : req.body.pcs_ctn || packaging.pcs_ctn;

    if (unit === "CARTON" && pcs_ctn == null) {
      throw new BadRequestError("Trường 'pcs_ctn' bắt buộc.");
    }

    if (unit === "PIECE" && pcs_ctn !== null) {
      throw new BadRequestError("Trường 'pcs_ctn' không hợp lệ.");
    }

    await req.services.packaging.v1.updateById(req.params.id, {
      ...req.body,
      unit,
      pcs_ctn,
    });
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật bao bì thành công.",
    });
  },

  async uploadPackagingImage(
    request: FastifyRequest<PackagingRequestType["UpdateImageById"]>,
    reply: FastifyReply
  ) {
    const packaging = await request.services.packaging.v1.findById(
      request.params.id
    );
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");

    if (
      !request.multerField ||
      !request.multerField.image ||
      !Array.isArray(request.multerField.image)
    ) {
      throw new BadRequestError("Không có file nào tải lên.");
    }

    const file = request.multerField.image[0];

    await request.services.packaging.v1.updateImageById(
      packaging.id,
      file,
      request.currUser?.id ?? ""
    );

    return reply.send({
      statusCode: StatusCodes.OK,
      message: "Cập nhật hinh bao bì thành công.",
    });
  },

  async deleteById(
    req: FastifyRequest<PackagingRequestType["DeleteById"]>,
    reply: FastifyReply
  ) {
    const packaging = await req.services.packaging.v1.findById(req.params.id);
    if (!packaging) throw new BadRequestError("Bao bì không tồn tại.");
    await req.services.packaging.v1.deleteById(packaging.id);
    reply.code(StatusCodes.OK).send({
      statusCode: StatusCodes.OK,
      message: "Xoá bao bì thành công.",
    });
  },
};
