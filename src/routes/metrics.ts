import { Router } from "express";
import { metrics } from "../metrics/metrics.js";

const metricsRouter = Router();

metricsRouter.get("/", (_req, res) => {
  res.json(metrics.getMetrics());
});

export default metricsRouter;
