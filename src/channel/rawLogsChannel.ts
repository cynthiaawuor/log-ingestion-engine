import type { EnrichedLog } from "../enricher/enricher.js";
import { metrics } from "../metrics/metrics.js";

const bufferSize = Number(process.env.RAW_LOG_BUFFER_SIZE ?? 10_000);

const batchSize = Number(process.env.RAW_LOG_BATCH_SIZE ?? 50);

const timeout = Number(process.env.CHANNEL_TIMEOUT_MS ?? 100);

class RawLogsChannel {
  private queue: EnrichedLog[] = [];

  push(log: EnrichedLog): boolean {
    if (this.queue.length >= bufferSize) {
      return false;
    }
    this.queue.push(log);
    metrics.setQueueBacklog(this.size());
    return true;
  }
  removeLogs(batchSize: number): EnrichedLog[] {
    const logs = this.queue.splice(0, batchSize);
    metrics.setQueueBacklog(this.size());
    return logs;
  }
  size(): number {
    return this.queue.length;
  }
}

export const rawLogsChannel = new RawLogsChannel();

export const consumeRawLogs = () => {
  setInterval(() => {
    if (rawLogsChannel.size() === 0) {
      return;
    }

    const batch = rawLogsChannel.removeLogs(batchSize);
    console.log(`Processing ${batch.length} logs`);
  }, timeout);
};
