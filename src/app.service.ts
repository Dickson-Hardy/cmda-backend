import { Injectable } from '@nestjs/common';
import { OperationalMetricsService } from './monitoring/operational-metrics.service';

@Injectable()
export class AppService {
  constructor(private readonly metrics: OperationalMetricsService) {}
  getHello(): string {
    return 'Welcome to CMDA Nigeria API';
  }

  getMetrics() {
    return { success: true, data: this.metrics.snapshot() };
  }
}
