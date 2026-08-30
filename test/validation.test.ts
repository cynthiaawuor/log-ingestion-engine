import assert from "node:assert/strict";
import test from "node:test";
import { Log, LogLevel } from "../src/entities/log.js";
import validate from "../src/ingestor/validate.js";

test("a complete log entry is valid", async () => {
  const log = new Log(
    "2026-08-30T12:00:00.000Z",
    LogLevel.INFO,
    "billing-api",
    "Invoice created",
  );

  assert.deepEqual(await validate(log), []);
});

test("validation reports fields with bad values", async () => {
  const log = new Log("not-a-date", "BAD" as LogLevel, "", "");
  const errors = await validate(log);

  assert.deepEqual(
    errors.map((error) => error.field).sort(),
    ["level", "message", "service", "timestamp"],
  );
});
