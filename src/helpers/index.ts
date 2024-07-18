import * as crypto from "crypto";

export const SHA256 = (message: string) =>
  crypto.createHash("sha256").update(message).digest("hex");

export const delay = (s: any) =>
  new Promise((res) => setTimeout(res, s * 1000));
