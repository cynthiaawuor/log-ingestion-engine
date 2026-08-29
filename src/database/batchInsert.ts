import { type Database } from "better-sqlite3";
import type { EnrichedLog } from "../enricher/enricher.js";

export const batchWriting = (db: Database, logs: EnrichedLog[]) => {
  const insert = db.prepare(`
    INSERT INTO logs (
      timestamp,
      service,
      level,
      message,
      received_at,
      source_ip,
      env
    )
    VALUES (
      @timestamp,
      @service,
      @level,
      @message,
      @received_at,
      @source_ip,
      @env
    )
  `);
  const batchInsert = db.transaction((logs) => {
    for (const log of logs) {
      insert.run(log);
    }
  });

  batchInsert(logs);
  console.log(`Successfully inserted ${logs.length} logs to SQLite`);
};
