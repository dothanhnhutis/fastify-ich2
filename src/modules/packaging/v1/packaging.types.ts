import type { Packaging, Warehouse } from "@modules/shared/types";
import type z from "zod/v4";
import type {
  createPackagingBodySchema,
  packagingParamsSchema,
  queryStringPackagingsSchema,
  queryStringWarehousesByPackagingIdSchema,
  updatePackagingByIdBodySchema,
} from "./packaging.schema";

export type PackagingDetail = Packaging & {
  total_quantity: number;
  warehouse_count: number;
  warehouses: StockAt[];
};

export type StockAt = Warehouse & {
  quantity: number;
};

export type PackagingRequestType = {
  Query: {
    Querystring: z.infer<typeof queryStringPackagingsSchema>;
  };
  GetById: {
    Params: z.infer<typeof packagingParamsSchema>;
  };
  GetWarehousesById: {
    Params: z.infer<typeof packagingParamsSchema>;
    Querystring: z.infer<typeof queryStringWarehousesByPackagingIdSchema>;
  };
  GetDetailById: {
    Params: z.infer<typeof packagingParamsSchema>;
  };
  Create: {
    Body: z.infer<typeof createPackagingBodySchema>;
  };
  UpdateById: {
    Params: z.infer<typeof packagingParamsSchema>;
    Body: z.infer<typeof updatePackagingByIdBodySchema>;
  };
  UpdateImageById: {
    Params: z.infer<typeof packagingParamsSchema>;
  };
  DeleteById: {
    Params: z.infer<typeof packagingParamsSchema>;
  };
};

// export interface IPackagingRepository {
//   findPackagings(
//     query: PackagingRequestType["Query"]["Querystring"]
//   ): Promise<{ packagings: Packaging[]; metadata: Metadata }>;

//   findPackagingById(packagingId: string): Promise<Packaging | null>;

//   findWarehousesByPackagingId(
//     packagingId: string,
//     query?: PackagingRequestType["GetWarehousesById"]["Querystring"]
//   ): Promise<{ warehouses: StockAt[]; metadata: Metadata }>;

//   findPackagingDetailById(packagingId: string): Promise<PackagingDetail | null>;

//   createNewPackaging(
//     data: PackagingRequestType["Create"]["Body"]
//   ): Promise<Packaging>;

//   updatePackagingById(
//     packagingId: string,
//     data: PackagingRequestType["UpdateById"]["Body"]
//   ): Promise<void>;

//   updateImageById(id: string, file: MulterFile, userId: string): Promise<void>;

//   deletePackagingById(packagingId: string): Promise<Packaging>;
// }
