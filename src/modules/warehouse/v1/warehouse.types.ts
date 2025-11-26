import type { Packaging, Warehouse } from "@modules/shared/types";
import type z from "zod/v4";
import type {
  createWarehouseBodySchema,
  queryStringPackagingByWarehouseIdSchema,
  queryStringWarehouseSchema,
  updateWarehouseByIdBodySchema,
  warehouseIdParamsSchema,
} from "./warehouse.schema";

export type WarehouseDetail = Warehouse & {
  packaging_count: number;
  packagings: PackagingAtWarehouse[];
};

export type PackagingAtWarehouse = Packaging & {
  quantity: number;
};

export type WarehouseRequestType = {
  Query: {
    Querystring: z.infer<typeof queryStringWarehouseSchema>;
  };
  GetById: {
    Params: z.infer<typeof warehouseIdParamsSchema>;
  };
  GetPackagingsById: {
    Params: z.infer<typeof warehouseIdParamsSchema>;
    Querystring: z.infer<typeof queryStringPackagingByWarehouseIdSchema>;
  };
  GetDetailById: {
    Params: z.infer<typeof warehouseIdParamsSchema>;
  };
  Create: {
    Body: z.infer<typeof createWarehouseBodySchema>;
  };
  UpdateById: {
    Params: z.infer<typeof warehouseIdParamsSchema>;
    Body: z.infer<typeof updateWarehouseByIdBodySchema>;
  };
  DeleteById: {
    Params: z.infer<typeof warehouseIdParamsSchema>;
  };
};

// export interface IWarehouseRepository {
//   findWarehouses(
//     query: WarehouseRequestType["Query"]["Querystring"]
//   ): Promise<{ warehouses: Warehouse[]; metadata: Metadata }>;
//   findWarehouseById(warehouseId: string): Promise<Warehouse | null>;
//   findPackagingsByWarehouseId(
//     warehouseId: string,
//     query?: WarehouseRequestType["GetPackagingsById"]["Querystring"]
//   ): Promise<{ packagings: PackagingAtWarehouse; metadata: Metadata }>;
//   findWarehouseDetailById(warehouseId: string): Promise<WarehouseDetail | null>;
//   createNewWarehouse(
//     data: WarehouseRequestType["Create"]["Body"]
//   ): Promise<Warehouse>;
//   updateWarehouseById(
//     warehouseId: string,
//     data: WarehouseRequestType["UpdateById"]["Body"]
//   ): Promise<void>;
//   deleteWarehouseById(id: string): Promise<Warehouse>;
// }
