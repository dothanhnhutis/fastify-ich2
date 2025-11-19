import { NotAuthorizedError } from "@shared/utils/error-handler";
import { comparePassword } from "@shared/utils/password";
import type { FastifyReply, FastifyRequest } from "fastify";
import { StatusCodes } from "http-status-codes";
import type { AuthRequestType } from "./auth.schema";

export const AuthController = {
  async signIn(
    request: FastifyRequest<AuthRequestType["SignIn"]>,
    reply: FastifyReply
  ) {
    const { email, password } = request.body;
    const user = await request.services.user.v1.findByEmail(email);

    if (
      !user ||
      !user.password_hash ||
      !(await comparePassword(user.password_hash, password))
    )
      throw new NotAuthorizedError("Email và mật khẩu không hợp lệ");

    const { sessionId, cookie } = await request.services.session.v1.create({
      userId: user.id,
      ip: request.ip || request.ips?.[0] || "",
      provider: "credential",
      userAgentRaw: request.headers["user-agent"] || "",
    });

    reply
      .code(200)
      .setSession(sessionId, { ...cookie })
      .send({
        statusCode: StatusCodes.OK,
        message: "Đăng nhập thành công.",
      });
  },
};
