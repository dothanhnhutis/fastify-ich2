import type { CookieOptions } from "@shared/plugins/cookie";
import { InternalServerError } from "@shared/utils/error-handler";
import type { ReqInfo, Session } from "../session.types";
import BaseSessionService from "./base.service";

export default class CreateService extends BaseSessionService {
  async execute(
    data: ReqInfo
  ): Promise<{ sessionId: string; cookie: CookieOptions }> {
    const session: Session = this.genSession(data);
    const sessionId: string = this.getSesionId(session);
    const { cookie } = session;

    const logService = this.log.child({
      service: "CreateService.execute",
      source: "cache",
      operation: "redis.set",
      command: `SET data->${sessionId}`,
    });
    try {
      if (cookie.expires) {
        await this.redis.set(
          sessionId,
          JSON.stringify(session),
          "PX",
          cookie.expires.getTime() - Date.now()
        );
      } else {
        await this.redis.set(sessionId, JSON.stringify(session));
      }

      logService.info("Tạo phiên đăng nhập thành công.");
      return {
        sessionId,
        cookie,
      };
    } catch (error: unknown) {
      logService.error({ error }, "Lỗi tạo phiên đăng nhập.");
      throw new InternalServerError();
    }
  }
}
