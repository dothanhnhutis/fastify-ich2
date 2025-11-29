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
  deleted_at: null | Date;
  created_at: Date;
  updated_at: Date;
};

export type Packaging = {
  id: string;
  name: string;
  min_stock_level: number;
  unit: "PIECE" | "CARTON";
  pcs_ctn: number | null;
  status: string;
  disabled_at: null | Date;
  deleted_at: null | Date;
  image: Image;
  created_at: Date;
  updated_at: Date;
};
