import { Router } from "express";
import { Log } from "../entities/log.js";
import validate from "../ingestor/validate.js";
import { enrichLog } from "../enricher/enricher.js";
import { rawLogsChannel } from "../channel/rawLogsChannel.js";
import { metrics } from "../metrics/metrics.js";

const logRouter = Router();

logRouter.post("/", async (req, res) => {
  const logs = req.body;

  if (!Array.isArray(logs)) {
    return res.status(400).json({
      error: "Validation failed",
      details: [
        { field: "body", reason: "must be a JSON array of log entries" },
      ],
    });
  }

  const uuid = crypto.randomUUID();

  const validLogs: Log[] = [];
  const invalidLogs: { errors: any[]; entry: any }[] = [];

  for (let log of logs) {
    const logEntry = new Log(
      log.timestamp,
      log.level,
      log.service,
      log.message,
    );
    const logValidationErrors = await validate(logEntry);

    if (logValidationErrors.length === 0) {
      validLogs.push(logEntry);
      metrics.recordLog(logEntry.level, logEntry.service);
    } else {
      invalidLogs.push({ errors: logValidationErrors, entry: log });
    }
  }

  //Enrich each valid log, then push to the channel

  for (const log of validLogs) {
    const enrichedLog = enrichLog(log, req);

    const pushedLog = rawLogsChannel.push(enrichedLog);

    if (!pushedLog) {
      return res.status(503).json({ error: "ingestion overloaded" });
    }
  }
  return res.status(202).json({
    status: "accepted",
    batchId: uuid,
    errors: invalidLogs,
    valid: validLogs,
  });
});

export default logRouter;
