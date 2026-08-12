import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OperationalMetricsService {
  private readonly logger = new Logger(OperationalMetricsService.name);
  private activeRequests = 0;
  private activeSockets = 0;
  private requests = 0;
  private errors = 0;
  private totalDurationMs = 0;

  requestStarted() {
    this.activeRequests += 1;
    this.requests += 1;
    const started = Date.now();
    return (statusCode: number) => {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
      this.totalDurationMs += Date.now() - started;
      if (statusCode >= 500) this.errors += 1;
    };
  }

  socketConnected() {
    this.activeSockets += 1;
  }

  socketDisconnected() {
    this.activeSockets = Math.max(0, this.activeSockets - 1);
  }

  snapshot() {
    const memory = process.memoryUsage();
    return {
      uptimeSeconds: Math.round(process.uptime()),
      activeRequests: this.activeRequests,
      activeSockets: this.activeSockets,
      requests: this.requests,
      errors: this.errors,
      averageResponseMs: this.requests ? Math.round(this.totalDurationMs / this.requests) : 0,
      memoryMb: {
        rss: Math.round(memory.rss / 1024 / 1024),
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024),
      },
    };
  }

  logSnapshot() {
    this.logger.log(JSON.stringify({ event: 'operational_metrics', ...this.snapshot() }));
  }
}
