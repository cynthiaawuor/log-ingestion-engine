import type { Request } from "express";
import type { Log } from "../entities/log.js";

export interface EnrichedLog extends Log {
  received_at: string;
  source_ip: string;
  env: string;
}
export const enrichLog = (log: Log, req: Request): EnrichedLog => {
  return {
    ...log,
    received_at: isoDateMicroseconds(),
    source_ip: getClientIpAddress(req),
    env: process.env.ENV || "production",
  };
};

const isoDateMicroseconds = (): string => {
  const now = new Date();
  //get microseconds remainder
  const time = performance.now();

  const microSecs = Math.floor((time % 1) * 1000);
  const microSecString = microSecs.toString().padStart(3, "0");

  //Replace the trailing Z with microseconds+Z
  const receivedAt = `${now.toISOString().slice(0, -1)}${microSecString}Z`;
  return receivedAt;
};

const getClientIpAddress = (req: Request): string => {
  const ipHeader = req.headers["x-forwarded-for"];

  if (typeof ipHeader === "string" && ipHeader.length > 0) {
    // pick the first header in the comma separated list
    return ipHeader.split(",")[0]?.trim() ?? "unknown ip address";
  }

  if (Array.isArray(ipHeader) && ipHeader.length > 0) {
    return ipHeader[0]?.trim() ?? "unknown ip address";
  }

  if (typeof ipHeader === "string") {
    return ipHeader.trim();
  }

  return req.socket.remoteAddress ?? "unknown ip address";
};
