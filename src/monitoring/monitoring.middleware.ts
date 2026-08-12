import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { OperationalMetricsService } from './operational-metrics.service';

@Injectable()
export class MonitoringMiddleware implements NestMiddleware {
  constructor(private readonly metrics: OperationalMetricsService) {}

  use(_request: Request, response: Response, next: NextFunction) {
    const finish = this.metrics.requestStarted();
    response.once('finish', () => finish(response.statusCode));
    next();
  }
}
