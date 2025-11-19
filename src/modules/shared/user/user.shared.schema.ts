import {
  buildSortField,
  queryParamToArray,
  queryParamToString,
  queryStringSchema,
} from "@modules/shared/validate";
import z from "zod/v4";

const sortUserEnum = buildSortField([
  "username",
  "email",
  "status",
  "deactived_at",
  "created_at",
  "updated_at",
]);

export const queryStringUsersSchema = queryStringSchema
  .extend({
    username: queryParamToString,
    id: queryParamToArray.pipe(
      z.array(
        z.string("Mã người dùng cập phải là chuỗi."),
        "Danh sách người dùng phải là mãng chuỗi."
      )
    ),
    email: queryParamToString.pipe(
      z.email({
        error: (ctx) => {
          if (ctx.code === "invalid_type") {
            return "Email phải là chuỗi.";
          } else {
            return "Email không đúng định dạng.";
          }
        },
      })
    ),
    status: queryParamToString.pipe(
      z.enum(
        ["ACTIVE", "INACTIVE"],
        `Trạng thái phải là một trong 'ACTIVE', 'INACTIVE'.`
      )
    ),
    sort: queryParamToArray.pipe(
      z.array(
        z.enum(
          sortUserEnum,
          `sort phải là một trong: ${sortUserEnum.join(", ")}`
        )
      )
    ),
  })
  .partial();
