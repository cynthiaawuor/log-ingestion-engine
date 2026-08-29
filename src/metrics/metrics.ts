export class Metrics {
  private totalLogs = 0;

  private logsByLevel: Record<string, number> = {};

  private logsByService: Record<string, number> = {};

  private errors = 0;

  private startTime = Date.now();

  private queueBacklog = 0;

  recordLog(level: string, service: string) {
    this.totalLogs++;

    this.logsByLevel[level] = (this.logsByLevel[level] ?? 0) + 1;

    this.logsByService[service] = (this.logsByService[service] ?? 0) + 1;

    if (level === "ERROR") {
      this.errors++;
    }
  }

  setQueueBacklog(size: number) {
    this.queueBacklog = size;
  }

  getMetrics() {
    const elapsedSeconds = (Date.now() - this.startTime) / 1000;

    const throughput = elapsedSeconds > 0 ? this.totalLogs / elapsedSeconds : 0;

    const errorRate = this.totalLogs > 0 ? this.errors / this.totalLogs : 0;

    return {
      total_logs_received: this.totalLogs,

      logs_by_level: this.logsByLevel,

      logs_by_service: this.logsByService,

      error_rate: errorRate,

      throughput: Number(throughput.toFixed(2)),

      queue_backlog: this.queueBacklog,
    };
  }
}

export const metrics = new Metrics();
