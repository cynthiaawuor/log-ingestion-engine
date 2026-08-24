import { Router } from "express";
import { Log } from "../entities/log.js";
import validate from "../ingestor/validate.js";

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
    // const logValidationErrors = await validate(log);
    const logEntry = new Log(
      log.timestamp,
      log.level,
      log.service,
      log.message,
    );
    const logValidationErrors = await validate(logEntry);

    if (logValidationErrors.length === 0) {
      validLogs.push(
        new Log(log.timestamp, log.level, log.service, log.message),
      );
    } else {
      invalidLogs.push({ errors: logValidationErrors, entry: log });
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
