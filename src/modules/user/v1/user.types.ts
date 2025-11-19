import type { Role } from "@modules/shared/role/role.shared.types";
import type { UserWithoutPassword } from "@modules/shared/user/user.shared.types";

export type UserDetail = UserWithoutPassword & {
  roles: Role[];
};
