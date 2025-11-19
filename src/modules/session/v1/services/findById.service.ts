import { InternalServerError } from "@shared/utils/error-handler";
import type { Session } from "../session.types";
import BaseSessionService from "./base.service";

export default class FindByIdService extends BaseSessionService {
  async execute(sessionId: string): Promise<Session | null> {
    const logService = this.log.child({
      service: "FindByIdService.execute",
      source: "cache",
      operation: "redis.get",
      command: `GET [sessionId]`,
    });

    try {
      const sessionCache = await this.redis.get(sessionId);
      if (!sessionCache) {
        logService.info(`Không tìm thấy session sessionId=${sessionId}.`);
        return null;
      }
      logService.info(`Tìm thấy phiên đăng nhập sessionId=${sessionId}.`);
      return JSON.parse(sessionCache) as Session;
    } catch (error) {
      logService.error(
        { error },
        `Lỗi khi lấy phiên đăng nhập sessionId=${sessionId}.`
      );
      throw new InternalServerError();
    }
  }
}
