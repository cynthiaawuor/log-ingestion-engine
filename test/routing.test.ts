import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { requireJsonContentType } from "../src/middleware/contentType.js";
import { handleLogPost } from "../src/routes/logs.js";

function responseStub() {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) { statusCode = code; return response; },
    json(value: unknown) { body = value; return response; },
  };
  return { response: response as unknown as Response, get statusCode() { return statusCode; }, get body() { return body; } };
}

test("log route accepts a valid log batch", async () => {
  const result = responseStub();
  await handleLogPost({
    body: [{ timestamp: "2026-08-30T12:00:00.000Z", level: "INFO", service: "web", message: "Started" }],
    headers: {},
    socket: { remoteAddress: "127.0.0.1" },
  } as Request, result.response);

  const body = result.body as { status: string; valid: unknown[] };
  assert.equal(result.statusCode, 202);
  assert.equal(body.status, "accepted");
  assert.equal(body.valid.length, 1);
});

test("content-type middleware rejects a request without JSON", () => {
  const result = responseStub();
  let nextCalled = false;
  requireJsonContentType({ headers: {} } as Request, result.response, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(result.statusCode, 415);
  assert.deepEqual(result.body, {
    error: "Unsupported Media Type",
    details: "Content-Type must be application/json",
  });
});
