import { InternalServerError } from "@shared/utils/error-handler";
import type { Session } from "../session.types";
import BaseSessionService from "./base.service";

export default class DeleteService extends BaseSessionService {
  async execute(session: Session): Promise<void> {
    const logService = this.log.child({
      service: "DeleteByIdService.execute",
      source: "cache",
      operation: "redis.del",
      command: `DEL [sessionId]`,
    });
    const sessionId = this.getSesionId(session);
    try {
      await this.redis.del(sessionId);
      logService.info(`Xoá phiên đăng nhập sessionId=${sessionId} thành công.`);
    } catch (error) {
      logService.error(
        { error },
        `Lỗi xoá phiên đăng nhập sessionId=${sessionId}.`
      );
      throw new InternalServerError();
    }
  }
}
