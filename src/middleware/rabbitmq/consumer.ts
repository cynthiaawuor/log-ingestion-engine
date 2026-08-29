import type { Channel, ConsumeMessage } from "amqplib";
import { batchWriting } from "../../database/batchInsert.js";
import { getDatabaseForService } from "../../database/sqlite.js";

const batchSizeLimit = Number(process.env.BATCH_SIZE) || 100;
const batchTimeLimitMs = 1000;

export const batchConsumer = (channel: Channel, queue: string) => {
  channel.prefetch(batchSizeLimit);

  let batch: ConsumeMessage[] = [];
  let batchTimer: NodeJS.Timeout | null = null;

  const processBatch = async () => {
    if (batch.length === 0) return;

    // Copy current batch and clear the global one immediately so new messages can buffer
    const messagesToProcess = [...batch];
    batch = [];
    if (batchTimer) {
      clearTimeout(batchTimer);
      batchTimer = null;
    }

    try {
      // Group parsed logs by service so they go to the correct SQLite database
      const logsByService: Record<string, any[]> = {};

      for (const msg of messagesToProcess) {
        const log = JSON.parse(msg.content.toString());
        const service = log.service || "unknown";

        if (!logsByService[service]) {
          logsByService[service] = [];
        }
        logsByService[service].push(log);
      }

      // Create an array of promises for concurrent database writing/retries
      const writePromises = [];
      for (const [service, logs] of Object.entries(logsByService)) {
        const db = getDatabaseForService(service);
        writePromises.push(batchWriting(db, logs));
      }
      // Wait for all DB writes (and potential retries/DLQ dumping) to complete
      await Promise.all(writePromises);

      // If everything succeeds, ACK all messages in this batch
      for (const msg of messagesToProcess) {
        channel.ack(msg);
      }
    } catch (error) {
      console.error("Batch processing failed:", error);
      // NACK all messages so they return to the queue for a retry
      for (const msg of messagesToProcess) {
        channel.nack(msg, false, true);
      }
    }
  };

  channel.consume(
    queue,
    (message: ConsumeMessage | null) => {
      if (!message) return;

      batch.push(message);

      // Start the 1-second countdown on the first message of a new batch
      if (batch.length === 1) {
        batchTimer = setTimeout(processBatch, batchTimeLimitMs);
      }

      // Process immediately if we hit the limit
      if (batch.length >= batchSizeLimit) {
        processBatch();
      }
    },
    { noAck: false },
  );
};
