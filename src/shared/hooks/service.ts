import RoleServiceV1 from "@modules/role/v1/services";
import SessionServiceV1 from "@modules/session/v1/services";
import UserServiceV1 from "@modules/user/v1/services";
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
    };
  });
};
