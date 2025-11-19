import { randomUUID } from "node:crypto";
import { BaseService } from "@shared/base-service";
import env from "@shared/config/env";
import type { CookieOptions } from "@shared/plugins/cookie";
import type { FastifyRequest } from "fastify";
import { UAParser } from "ua-parser-js";
import type { ReqInfo, Session } from "../session.types";

export default class BaseSessionService extends BaseService {
  constructor(fastify: FastifyRequest) {
    super(fastify, { module: "session", version: "v1" });
  }

  static makeSessionId(userId: string, id: string) {
    return `${env.SESSION_KEY_NAME}:${userId}:${id}`;
  }

  protected getSesionId(session: Session) {
    return `${env.SESSION_KEY_NAME}:${session.userId}:${session.id}`;
  }

  protected getAllSessionKey(userId: string) {
    return `${env.SESSION_KEY_NAME}:${userId}:*`;
  }

  protected genSession(data: ReqInfo) {
    const randomId = randomUUID();
    const now = new Date();

    const cookieOpt: CookieOptions = {
      path: "/",
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      expires: new Date(now.getTime() + env.SESSION_MAX_AGE),
      ...data.cookie,
    };

    const session: Session = {
      id: randomId,
      provider: data.provider,
      userId: data.userId,
      cookie: cookieOpt,
      ip: data.ip,
      userAgent: UAParser(data.userAgentRaw),
      lastAccess: now,
      createAt: now,
    };

    return session;
  }
}
