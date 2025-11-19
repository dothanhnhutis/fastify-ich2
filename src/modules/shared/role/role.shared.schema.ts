import {
  buildSortField,
  queryParamToArray,
  queryParamToString,
  queryStringSchema,
} from "@modules/shared/validate";
import z from "zod/v4";

const sortRoleEnum = buildSortField([
  "name",
  "permissions",
  "description",
  "deactived_at",
  "status",
  "created_at",
  "updated_at",
]);

export const queryStringRolesSchema = queryStringSchema
  .extend({
    name: queryParamToString,
    id: queryParamToArray.pipe(
      z.array(
        z.string("Mã vai trò phải là chuỗi."),
        "Danh sách mã vai trò phải là mãng."
      )
    ),
    permission: queryParamToArray.pipe(
      z.array(z.string("Quyền phải là chuỗi."), "Danh sách quyền phải là mãng.")
    ),
    description: queryParamToString,
    status: queryParamToString.pipe(
      z.enum(
        ["ACTIVE", "INACTIVE"],
        `Trạng thái phải là một trong 'ACTIVE', 'INACTIVE'.`
      )
    ),
    sort: queryParamToArray.pipe(
      z.array(
        z.enum(
          sortRoleEnum,
          `sort phải là một trong: ${sortRoleEnum.join(", ")}`
        )
      )
    ),
  })
  .partial();
