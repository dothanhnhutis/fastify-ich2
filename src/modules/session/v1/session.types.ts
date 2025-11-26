import type { CookieOptions } from "@shared/plugins/cookie";
import type z from "zod/v4";
import type { sessionIdParamSchema } from "./session.schema";

export type ReqInfo = {
  userId: string;
  ip: string;
  userAgentRaw: string;
  provider: "credential" | "google";
  cookie?: CookieOptions;
};

export type Session = Required<Omit<ReqInfo, "userAgentRaw">> & {
  id: string;
  userAgent: UAParser.IResult;
  lastAccess: Date;
  createAt: Date;
};

export type SessionRequestType = {
  DeleteById: {
    Params: z.infer<typeof sessionIdParamSchema>;
  };
};
