import {
  queryStringRolesSchema,
  queryStringUsersSchema,
} from "@modules/shared/schema";
import * as z from "zod/v4";

export const userIdParamSchema = z.object({
  id: z.string(),
});

export const createBodySchema = z
  .object({
    username: z
      .string("Tên người dùng phải là chuỗi.")
      .trim()
      .min(1, "Tên người dùng không được trống."),
    email: z.email({
      error: (ctx) => {
        if (ctx.code === "invalid_type") return "Email phải là chuỗi.";
        if (ctx.code === "invalid_format") return "Email không đúng định dạng.";
        return undefined;
      },
    }),
    roleIds: z
      .array(
        z.string("Vai trò phải là chuỗi.").trim(),
        "Danh sách vai trò phải là mảng."
      )
      .optional(),
    password: z
      .string("Mật khẩu phải là chuỗi.")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[@$!%*?&])[A-Za-z0-9@$!%*?&]+$/,
        "Mật khẩu phải có chữ hoa, chữ thường, chữ số và ký tự đặc biệt'@$!%*?&'. Ex: Abc@123123"
      )
      .min(8, "Mật khẩu quá ngắn.")
      .max(125, "Mật khẩu quá dài.")
      .optional(),
  })
  .strict();

export const updateByIdBodySchema = z
  .object({
    status: z.enum(
      ["ACTIVE", "INACTIVE"],
      "Trạng thái phải là một trong 'ACTIVE', 'INACTIVE'."
    ),
    roleIds: z.array(
      z.string("Vai trò phải là chuỗi.").trim(),
      "Danh sách vai trò phải là mảng."
    ),
    username: z
      .string("Tên người dùng phải là chuỗi.")
      .trim()
      .min(1, "Tên người dùng không được trống.")
      .max(100, "Tên người dùng tối đa có 100 ký tự."),
  })
  .partial();

export const updateBodySchema = updateByIdBodySchema.pick({ username: true });

export const userSchema = {
  query: {
    querystring: queryStringUsersSchema,
  },
  getById: {
    params: userIdParamSchema,
  },
  getRolesById: {
    params: userIdParamSchema,
    querystring: queryStringRolesSchema,
  },
  getDetailById: {
    params: userIdParamSchema,
  },
  create: {
    body: createBodySchema,
  },
  update: {
    body: updateBodySchema,
  },
  updateById: {
    params: userIdParamSchema,
    body: updateByIdBodySchema,
  },
};
