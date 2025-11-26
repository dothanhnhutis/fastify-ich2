import type { Role, UserWithoutPassword } from "@modules/shared/types";

export type RoleDetail = Role & {
  user_count: number;
  users: UserWithoutPassword[];
};
