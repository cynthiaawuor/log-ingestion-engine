import "dotenv/config";
import express from "express";
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

const PORT = Number(process.env.PORT) || 5000;
const rateLimit = Number(process.env.RATE_LIMIT ?? 1000);

app.use(
  "/logs",
  requireJsonContentType,
  redisTokenBucketLimiter(rateLimit, 0.1),
  logRouter,
);
app.use("/metrics", metricsRouter);

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
