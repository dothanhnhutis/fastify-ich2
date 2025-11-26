import type {
  queryStringRolesSchema,
  queryStringUsersSchema,
} from "@modules/shared/schema";
import type {
  Role,
  UserBase,
  UserWithoutPassword,
} from "@modules/shared/types";
import type z from "zod/v4";
import type {
  createBodySchema,
  updateBodySchema,
  updateByIdBodySchema,
  userIdParamSchema,
} from "./user.schema";

export type UserPassword = UserBase & {
  password_hash: string;
};

export type UserDetailWithoutPassword = UserWithoutPassword & {
  role_count: number;
  roles: Role[];
};

export type UserRequestType = {
  Query: {
    Querystring: z.infer<typeof queryStringUsersSchema>;
  };
  GetById: { Params: z.infer<typeof userIdParamSchema> };
  GetRolesById: {
    Params: z.infer<typeof userIdParamSchema>;
    Querystring: z.infer<typeof queryStringRolesSchema>;
  };
  GetDetailById: { Params: z.infer<typeof userIdParamSchema> };
  Create: {
    Body: z.infer<typeof createBodySchema>;
  };
  UpdateById: {
    Params: z.infer<typeof userIdParamSchema>;
    Body: z.infer<typeof updateByIdBodySchema>;
  };
  Update: {
    Body: z.infer<typeof updateBodySchema>;
  };
};
