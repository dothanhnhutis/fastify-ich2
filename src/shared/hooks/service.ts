import PackagingServiceV1 from "@modules/packaging/v1/services";
import RoleServiceV1 from "@modules/role/v1/services";
import SessionServiceV1 from "@modules/session/v1/services";
import UserServiceV1 from "@modules/user/v1/services";
import WarehouseServiceV1 from "@modules/warehouse/v1/services";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    services: {
      session: {
        v1: SessionServiceV1;
      };
      user: {
        v1: UserServiceV1;
      };
      role: {
        v1: RoleServiceV1;
      };
      warehouse: {
        v1: WarehouseServiceV1;
      };
      packaging: {
        v1: PackagingServiceV1;
      };
    };
  }
}

export const serviceHook = (fastify: FastifyInstance) => {
  fastify.decorateRequest("services");
  fastify.addHook("onRequest", async (request) => {
    request.services = {
      session: {
        v1: new SessionServiceV1(request),
      },
      user: {
        v1: new UserServiceV1(request),
      },
      role: {
        v1: new RoleServiceV1(request),
      },
      warehouse: {
        v1: new WarehouseServiceV1(request),
      },
      packaging: {
        v1: new PackagingServiceV1(request),
      },
    };
  });
};
