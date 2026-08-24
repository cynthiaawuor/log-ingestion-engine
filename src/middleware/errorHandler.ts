import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "Malformed JSON",
      details: err.message,
    });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({
      error: "Payload Too Large",
      details: `Payload exceeds ${err.limit} byte limit`,
    });
  }

  next(err);
}
