import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MonitoringMiddleware } from './monitoring.middleware';
import { OperationalMetricsService } from './operational-metrics.service';

@Global()
@Module({
  providers: [OperationalMetricsService, MonitoringMiddleware],
  exports: [OperationalMetricsService],
})
export class MonitoringModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MonitoringMiddleware).forRoutes('*');
  }
}
