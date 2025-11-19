import type { Role } from "@modules/shared/role/role.shared.types";
import type { UserWithoutPassword } from "@modules/shared/user/user.shared.types";

export type RoleDetail = Role & {
  users: Omit<UserWithoutPassword, "role_count">[];
};
