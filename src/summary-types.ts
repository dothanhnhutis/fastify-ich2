// cookie plugin
export interface CookieOptions {
  maxAge?: number;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  priority?: "low" | "medium" | "high";
  // signed?: boolean;
  // partitioned?: boolean;
  // encode?: (val: string) => string;
}

// session
export type ReqInfo = {
  userId: string;
  ip: string;
  userAgentRaw: string;
  provider: "credential" | "google";
  cookie?: CookieOptions;
};

export type Session = Required<Omit<ReqInfo, "userAgentRaw">> & {
  id: string;
  userAgent: UAParser.IResult;
  lastAccess: Date;
  createAt: Date;
};

// file
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

// user
export type UserPassword = UserBase & {
  password_hash: string;
};

export type UserDetailWithoutPassword = UserWithoutPassword & {
  role_count: number;
  roles: Role[];
};

// user Service
export type FindUserByEmailService = UserPassword;
export type FindUserByIdService = UserPassword;
export type FindUserWithoutPasswordByIdService = UserWithoutPassword;
export type FindUserWithoutPasswordByEmailService = UserWithoutPassword;
export type FindManyUserService = {
  users: UserDetailWithoutPassword[];
  metadata: Metadata;
};
export type FindRolesByUserIdService = {
  roles: Role[];
  metadata: Metadata;
};
export type FindUserDetailByIdService = UserDetailWithoutPassword;

// role
export type RoleDetail = Role & {
  user_count: number;
  users: UserWithoutPassword[];
};

// role service
export type FindRoleByIdService = Role;
export type FindRoleDetailByIdService = RoleDetail;
export type FindManyRoleService = {
  roles: RoleDetail;
  metadata: Metadata;
};
export type FindUsersByRoleIdService = {
  users: UserWithoutPassword;
  metadata: Metadata;
};

// warehouse
export type WarehouseDetail = Warehouse & {
  packaging_count: number;
  packagings: PackagingAtWarehouse[];
};

export type PackagingAtWarehouse = PackagingBase & {
  quantity: number;
};

// warehouse service
export type FindWarehouseByIdService = Warehouse;
export type FindDetailWarehouseByIdService = WarehouseDetail;
export type FindManyWarehouseService = {
  warehouses: WarehouseDetail[];
  metadata: Metadata;
};
export type FindPackagingsByWarehouseIdService = {
  packagings: PackagingAtWarehouse[];
  metadata: Metadata;
};

// packaging
export type PackagingDetail = PackagingBase & {
  total_quantity: number;
  warehouse_count: number;
  warehouses: StockAt[];
};

export type StockAt = Warehouse & {
  quantity: number;
};

export type Packaging = PackagingBase & {
  total_quantity: number;
};

// packaging service
export type FindPackagingByIdService = Packaging;
export type FindDetailPackagingByIdService = PackagingDetail;
export type FindManyPackagingService = {
  packagings: PackagingDetail[];
  metadata: Metadata;
};
export type FindWarehousesByPackagingIdService = {
  warehouses: StockAt[];
  metadata: Metadata;
};

// share
export type Role = {
  id: string;
  name: string;
  permissions: string[];
  description: string;
  status: string;
  disabled_at: null | Date;
  deleted_at: null | Date;
  can_delete: boolean;
  can_update: boolean;
  created_at: Date;
  updated_at: Date;
};

export type UserBase = {
  id: string;
  email: string;
  username: string;
  status: string;
  disabled_at: null | Date;
  deleted_at: null | Date;
  avatar: Image | null;
  created_at: Date;
  updated_at: Date;
};
export type UserWithoutPassword = UserBase & {
  has_password: string;
};
export type Metadata = {
  totalItem: number;
  totalPage: number;
  hasNextPage: boolean;
  limit: number;
  itemStart: number;
  itemEnd: number;
};

export interface Image {
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
export type Warehouse = {
  id: string;
  name: string;
  address: string;
  status: string;
  disabled_at: null | Date;
  deleted_at: Date;
  created_at: Date;
  updated_at: Date;
};

export type PackagingBase = {
  id: string;
  name: string;
  min_stock_level: number;
  unit: "PIECE" | "CARTON";
  pcs_ctn: number | null;
  status: string;
  disabled_at: null | Date;
  deleted_at: Date | null;
  image: Image;
  created_at: Date;
  updated_at: Date;
};
