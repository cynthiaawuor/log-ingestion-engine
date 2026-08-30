# Log Ingestion Engine

A small TypeScript service that accepts batches of application logs, validates and enriches them, and buffers them in memory. It also includes RabbitMQ publishing/consuming helpers with a local fallback queue.

## Architecture

```text
HTTP client
    |
    v
POST /logs -> content-type check -> Redis token bucket -> validation + enrichment
                                                               |
                                                               v
                                                        in-memory channel
                                                               |
                                                               v
                                                      batch processing timer

RabbitMQ publisher -- unavailable/publish error --> in-memory fallback queue
RabbitMQ consumer --> SQLite databases by service --> repeated failure --> dead-letter JSON lines
```

`GET /metrics` exposes the values used by `GET /dashboard`. The dashboard is a dependency-free HTML/CSS/JavaScript page that polls metrics every five seconds.

## Setup

Requirements: Node.js 24+, npm, Redis, and (optionally) Docker for RabbitMQ.

```bash
npm install
docker compose up -d
```

Create a `.env` file if the defaults do not match your local services:

```env
PORT=5000
REDIS_HOST=localhost
REDIS_PORT=6379
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=user
RABBITMQ_PASS=root
RATE_LIMIT=1000
```

Start Redis separately, then build and run the API:

```bash
npm run build
npm start
```

Open `http://localhost:5000/dashboard` to view the dashboard.

## API

### `POST /logs`

Accepts a JSON array of log entries. A request must include `Content-Type: application/json`.

```bash
curl -X POST http://localhost:5000/logs \
  -H 'Content-Type: application/json' \
  -d '[{
    "timestamp": "2026-08-30T12:00:00.000Z",
    "level": "INFO",
    "service": "checkout",
    "message": "Order accepted"
  }]'
```

Valid levels are `INFO`, `WARN`, `ERROR`, and `DEBUG`. The response is `202 Accepted`, with valid entries and any validation errors. Requests without JSON receive `415`; a full rate-limit bucket receives `429`.

### `GET /metrics`

Returns JSON containing total logs, logs grouped by level/service, error rate, throughput, and queue backlog.

### `GET /dashboard`

Returns the auto-refreshing dashboard. It uses no external JavaScript or CSS libraries.

## Concurrency model

- Express handles incoming requests asynchronously.
- Each accepted log is added to a bounded in-memory queue (`RAW_LOG_BUFFER_SIZE`, default `10,000`). A full queue returns `503`.
- A timer removes batches from that queue every `CHANNEL_TIMEOUT_MS` (default `100ms`), using `RAW_LOG_BATCH_SIZE` (default `50`).
- RabbitMQ consumers group messages by service and write the groups concurrently to their SQLite databases.
- Database writes retry three times. After retries are exhausted, each log is written to the dead-letter file.
- Redis runs the token-bucket Lua script atomically, so concurrent requests cannot spend the same token twice.

## Tests

The tests use Node's built-in test runner—there is no test framework to learn.

```bash
npm test
```

They cover validation, rate-limit decisions, routing, the enrichment/channel pipeline, RabbitMQ fallback behavior, and dead-letter file output. Redis and RabbitMQ are not required for these tests.

## Load test

Start the API and dependencies first, then run:

```bash
npm run load-test
```

By default it sends **1,000 logs per second for 10 seconds**. Change the target, rate, or duration when needed:

```bash
TARGET_URL=http://localhost:5000/logs LOGS_PER_SECOND=1000 DURATION_SECONDS=30 npm run load-test
```

The script prints accepted requests for each second and a final total. Keep `RATE_LIMIT` at least as high as `LOGS_PER_SECOND` for a clean 1,000-log/sec run.
