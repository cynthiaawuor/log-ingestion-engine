import { type Database } from "better-sqlite3";
import type { EnrichedLog } from "../enricher/enricher.js";
import { writeToDeadLetter } from "../deadLetter/deadLetter.js";

const retryDelays = [1000, 5000, 10000]; //1s,5s,10s
export const batchWriting = async (db: Database, logs: EnrichedLog[]) => {
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

  let attempt = 0;
  while (attempt <= retryDelays.length) {
    try {
      if (attempt > 0) {
        console.log(
          `[Retry ${attempt}/3] Retrying write for ${logs.length} logs to service`,
        );
      }
      batchInsert(logs);
      console.log(`Successfully inserted ${logs.length} logs to SQLite`);
      return;
    } catch (error: any) {
      attempt++;
      if (attempt > 3) {
        console.error(
          `Max retries reached for service. Writing to deadLetter Queue`,
        );
        for (const log of logs) {
          await writeToDeadLetter(log, error.message);
        }
        return;
      }

      const waitTime = retryDelays[attempt - 1];
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
};
