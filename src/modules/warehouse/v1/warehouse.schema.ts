import z from "zod/v4";
import {
  buildSortField,
  queryParamToArray,
  queryParamToString,
  queryStringSchema,
} from "../../shared/schema";

export const warehouseIdParamsSchema = z.object({
  id: z.string(),
});

const sortPackagingEnum = buildSortField([
  "name",
  "min_stock_level",
  "unit",
  "pcs_ctn",
  "status",
  "created_at",
  "updated_at",
  "quantity",
]);

export const queryStringPackagingByWarehouseIdSchema = queryStringSchema
  .extend({
    name: queryParamToString.pipe(z.string("Tên kho hàng phải là chuỗi.")),
    unit: queryParamToString.pipe(
      z.enum(["PIECE", "CARTON"], `Loại bao bì phải là 'PIECE' hoặc 'CARTON'.`)
    ),
    status: queryParamToString.pipe(
      z.enum(
        ["ACTIVE", "DISABLED"],
        `Trạng thái phải là một trong 'ACTIVE', 'DISABLED'.}`
      )
    ),
    sort: queryParamToArray.pipe(
      z.array(
        z.enum(
          sortPackagingEnum,
          `sort phải là một trong: ${sortPackagingEnum.join(", ")}`
        )
      )
    ),
  })
  .partial();

const sortEnum = buildSortField([
  "name",
  "address",
  "status",
  "disabled_at",
  "created_at",
  "updated_at",
]);

export const queryStringWarehouseSchema = queryStringSchema
  .extend({
    name: queryParamToString.pipe(z.string("Tên kho hàng phải là chuỗi.")),
    address: queryParamToString.pipe(z.string("Địa chỉ kho phải là chuỗi.")),
    deleted: queryParamToString.pipe(
      z.coerce.boolean("Trạng thái kho phải là boolean.")
    ),
    sort: queryParamToArray.pipe(
      z.array(
        z.enum(sortEnum, `sort phải là một trong: ${sortEnum.join(", ")}`)
      )
    ),
  })
  .partial();

export const createWarehouseBodySchema = z
  .object({
    name: z
      .string("Tên kho hàng phải là chuỗi.")
      .trim()
      .min(1, "Tên kho hàng không được trống."),
    address: z
      .string("Địa chỉ kho hàng phải là chuỗi.")
      .trim()
      .min(1, "Địa chỉ kho hàng không được trống."),
    packagingIds: z
      .array(z.string("Mã bao bì phải là chuỗi."), "Mã bao bì phải là mãng.")
      .optional(),
  })
  .strict();

export const updateWarehouseByIdBodySchema = z
  .object({
    name: z
      .string("Tên kho hàng phải là chuỗi.")
      .trim()
      .min(1, "Tên kho hàng không được trống."),
    address: z
      .string("Địa chỉ kho hàng phải là chuỗi.")
      .trim()
      .min(1, "Địa chỉ kho hàng không được trống."),
    packagingIds: z.array(
      z.string("Mã bao bì phải là chuỗi."),
      "Mã bao bì phải là mãng."
    ),
    status: z.enum(
      ["ACTIVE", "DISABLED"],
      "Trạng thái phải là một trong 'ACTIVE', 'DISABLED'."
    ),
  })
  .partial();

export const warehouseSchema = {
  query: {
    querystring: queryStringWarehouseSchema,
  },
  getById: {
    params: warehouseIdParamsSchema,
  },
  getPackagingsById: {
    querystring: queryStringPackagingByWarehouseIdSchema,
    params: warehouseIdParamsSchema,
  },
  getDetailById: {
    params: warehouseIdParamsSchema,
  },
  create: {
    body: createWarehouseBodySchema,
  },
  updateById: {
    params: warehouseIdParamsSchema,
    body: updateWarehouseByIdBodySchema,
  },
  deleteById: {
    params: warehouseIdParamsSchema,
  },
};
