export type Metadata = {
  totalItem: number;
  totalPage: number;
  hasNextPage: boolean;
  limit: number;
  itemStart: number;
  itemEnd: number;
};

export interface FileUpload {
  id: string;
  original_name: string;
  mime_type: string;
  destination: string;
  file_name: string;
  path: string;
  size: string;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  // deleted_at: Date;
  // category_id: string | null;
}

export interface Avatar {
  id: string;
  width: number;
  height: number;
  is_primary: boolean;
  original_name: string;
  mime_type: string;
  destination: string;
  file_name: string;
  size: number;
  created_at: Date;
}

// user
export type UserBase = {
  id: string;
  email: string;
  username: string;
  status: string;
  deactived_at: null | Date;
  created_at: Date;
  updated_at: Date;
};

export type FindUserByEmailService = UserBase & {
  password_hash: string;
};
export type FindUserByIdService = FindUserByEmailService;

export type FindUserWithoutPasswordByIdService = UserBase & {
  has_password: boolean;
  role_count: number;
  avatar: Avatar | null;
};
export type FindUserWithoutPasswordByEmailService =
  FindUserWithoutPasswordByIdService;

export type FindManyUserService = {
  users: FindUserWithoutPasswordByIdService[];
  metadata: Metadata;
};

export type FindUserRolesByIdService = {
  roles: RoleBase[];
  metadata: Metadata;
};

export type FindUserDetailByIdService = FindUserWithoutPasswordByIdService & {
  roles: RoleBase[];
};

// role
export type FindRoleByIdService = RoleBase & {
  user_count: number;
};

export type FindRoleDetailByIdService = RoleBase & {
  user_count: number;
  users: (UserBase & { has_password: boolean })[];
};

export type FindManyRoleService = {
  roles: (RoleBase & {
    user_count: number;
    users: (UserBase & {
      has_password: boolean;
      avatar: Avatar;
    })[];
  })[];
  metadata: Metadata;
};

// share
export type RoleBase = {
  id: string;
  name: string;
  permissions: string[];
  description: string;
  status: string;
  deactived_at: null | Date;
  can_delete: boolean;
  can_update: boolean;
  created_at: Date;
  updated_at: Date;
};
