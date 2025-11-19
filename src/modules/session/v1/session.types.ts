import type { CookieOptions } from "@shared/plugins/cookie";
export type Session = {
  id: string;
  provider: "google" | "credential";
  userId: string;
  cookie: CookieOptions;
  ip: string;
  userAgent: UAParser.IResult;
  lastAccess: Date;
  createAt: Date;
};

export type ReqInfo = {
  userId: string;
  ip: string;
  userAgentRaw: string;
  provider: "credential" | "google";
  cookie?: CookieOptions;
};
