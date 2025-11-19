import env from "@shared/config/env";
import { InternalServerError } from "@shared/utils/error-handler";
import type { Session } from "../session.types";
import BaseSessionService from "./base.service";

export default class RefreshService extends BaseSessionService {
  async execute(oldSession: Session): Promise<Session | null> {
    const logService = this.log.child({
      service: "RefreshService.execute",
      source: "cache",
      operation: "redis.set",
      command: `SET newSession->${oldSession.id}`,
    });
    const newSession: Session = {
      ...oldSession,
    };
    const sessionId = this.getSesionId(oldSession);

    try {
      const now = Date.now();
      const expires: Date = new Date(now + env.SESSION_MAX_AGE);
      newSession.lastAccess = new Date(now);
      newSession.cookie.expires = expires;

      await this.redis.set(
        sessionId,
        JSON.stringify(newSession),
        "PX",
        expires.getTime() - Date.now(),
        "XX"
      );
      logService.info("Làm mới phiên đăng nhập thành công.");
      return newSession;
    } catch (error: unknown) {
      logService.error({ error }, "Lỗi làm mới phiên đăng nhập.");
      throw new InternalServerError();
    }
  }
}
