import type { Session } from "@modules/session/v1/session.types";
import env from "@shared/config/env";
import { CryptoAES } from "@shared/utils/crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { UserDetailWithoutPassword } from "summary-types";
import type { CookieOptions } from "./cookie";

declare module "fastify" {
  interface FastifyRequest {
    currUser: UserDetailWithoutPassword | null;
    session: Session | null;
  }

  interface FastifyReply {
    setSession: (
      sessionId: string,
      options?: CookieOptions & { name?: string }
    ) => FastifyReply;
  }
}

interface SessionOptions {
  cookieName: string;
  secret: string;
  refreshCookie?: boolean;
}

async function session(fastify: FastifyInstance, options: SessionOptions) {
  const { cookieName, secret, refreshCookie = false } = options;
  const cryptoCookie = new CryptoAES("aes-256-gcm", secret);

  fastify.decorateRequest("currUser", null);
  fastify.decorateRequest("session", null);

  fastify.decorateReply(
    "setSession",
    function (sessionId: string, options?: CookieOptions & { name?: string }) {
      const encryptData = cryptoCookie.encrypt(sessionId);
      const { name = cookieName, ...other } = options || {};
      this.setCookie(name, encryptData, {
        ...other,
      });
      return this;
    }
  );

  fastify.addHook(
    "onRequest",
    async (request: FastifyRequest, res: FastifyReply) => {
      const sessionDescript = request.cookies.get(cookieName);
      if (!sessionDescript) return;
      const sessionId = cryptoCookie.decrypt(sessionDescript);
      const session = await request.services.session.v1.findById(sessionId);
      if (!session) return;
      const userRoleDetail =
        await request.services.user.v1.findDetailWithoutPasswordById(
          session.userId
        );
      if (!userRoleDetail) {
        res.clearCookie(cookieName);
      } else {
        request.session = session;
        request.currUser = userRoleDetail;
      }
    }
  );

  fastify.addHook("preHandler", async (request, reply) => {
    if (request.session && refreshCookie) {
      const refreshSession = await request.services.session.v1.refresh(
        request.session
      );
      const sessionId = `${env.SESSION_KEY_NAME}:${request.session.userId}:${request.session.id}`;
      if (refreshSession) {
        reply.setSession(sessionId, refreshSession.cookie);
      }
    }
  });
}

export default fp(session, {
  name: "sessionPlugin",
});
