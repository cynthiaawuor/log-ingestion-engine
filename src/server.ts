import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import logRouter from "./routes/logs.js";
import { requireJsonContentType } from "./middleware/contentType.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { redisTokenBucketLimiter } from "./middleware/ratelimiter/rateLimiter.js";
import { consumeRawLogs } from "./channel/rawLogsChannel.js";
import {
  bindExchangeToQueue,
  connectRabbitMQ,
} from "./middleware/rabbitmq/connection.js";
import metricsRouter from "./routes/metrics.js";

const app = express();
app.use(express.json({ limit: "1mb" }));

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboardDirectory = path.join(projectRoot, "client");

const PORT = Number(process.env.PORT) || 5000;
const rateLimit = Number(process.env.RATE_LIMIT ?? 1000);

app.use(
  "/logs",
  requireJsonContentType,
  redisTokenBucketLimiter(rateLimit, rateLimit),
  logRouter,
);
app.use("/metrics", metricsRouter);

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(dashboardDirectory, "dashboard.html"));
});
app.get("/dashboard/styles.css", (_req, res) => {
  res.sendFile(path.join(dashboardDirectory, "style.css"));
});
app.get("/dashboard/script.js", (_req, res) => {
  res.type("application/javascript");
  res.sendFile(path.join(dashboardDirectory, "script.ts"));
});

app.use(errorHandler);

const channel = await connectRabbitMQ();

if (channel) {
  await bindExchangeToQueue(channel);
}
consumeRawLogs();

app.listen(PORT, (err) => {
  if (err) {
    console.log(err);
  }
  console.log(`Server listening on localhost:${PORT}`);
});
