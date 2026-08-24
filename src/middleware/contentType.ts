import type { Request, Response, NextFunction } from "express";
export const requireJsonContentType = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const contentType = req.headers["content-type"];

  if (
    !contentType ||
    !contentType.toLowerCase().startsWith("application/json")
  ) {
    return res.status(415).json({
      error: "Unsupported Media Type",
      details: "Content-Type must be application/json",
    });
  }
  next();
};
