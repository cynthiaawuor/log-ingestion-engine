import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { rawLogsChannel } from "../src/channel/rawLogsChannel.js";
import { writeToDeadLetter } from "../src/deadLetter/deadLetter.js";
import { enrichLog, type EnrichedLog } from "../src/enricher/enricher.js";
import { Log, LogLevel } from "../src/entities/log.js";
import { getFallbackQueue } from "../src/middleware/rabbitmq/fallbackQueue.js";
import { publishLog } from "../src/middleware/rabbitmq/publisher.js";

const log: EnrichedLog = {
  timestamp: "2026-08-30T12:00:00.000Z",
  level: LogLevel.ERROR,
  service: "orders",
  message: "Database unavailable",
  received_at: "2026-08-30T12:00:00.000000Z",
  source_ip: "127.0.0.1",
  env: "test",
};

test("pipeline enriches a log and puts it in the in-memory channel", () => {
  rawLogsChannel.removeLogs(rawLogsChannel.size());
  const enriched = enrichLog(new Log(log.timestamp, log.level, log.service, log.message), {
    headers: { "x-forwarded-for": "203.0.113.9" }, socket: { remoteAddress: "127.0.0.1" },
  } as never);

  assert.equal(enriched.source_ip, "203.0.113.9");
  assert.equal(rawLogsChannel.push(enriched), true);
  assert.deepEqual(rawLogsChannel.removeLogs(1), [enriched]);
});

test("publisher uses fallback storage when RabbitMQ is unavailable", async () => {
  const before = getFallbackQueue().length;
  await publishLog(null, log, "exchange_service1");
  assert.equal(getFallbackQueue().length, before + 1);
  assert.deepEqual(getFallbackQueue().at(-1), log);
});

test("dead letter writer creates a JSON line for a failed log", async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), "log-ingestion-test-"));
  const filePath = path.join(folder, "failed.json");
  try {
    await writeToDeadLetter(log, "SQLite is unavailable", filePath);
    const [entry] = fs.readFileSync(filePath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.equal(entry.errorMessage, "SQLite is unavailable");
    assert.deepEqual(entry.originalLog, log);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});
