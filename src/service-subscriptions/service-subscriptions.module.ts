import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServiceSubscriptionsController } from './service-subscriptions.controller';
import { ServiceSubscriptionsService } from './service-subscriptions.service';
import { ServiceSubscription, ServiceSubscriptionSchema } from './service-subscriptions.schema';
import { ServiceInvoicePdfService } from './service-invoice-pdf.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServiceSubscription.name, schema: ServiceSubscriptionSchema },
    ]),
    EmailModule,
  ],
  controllers: [ServiceSubscriptionsController],
  providers: [ServiceSubscriptionsService, ServiceInvoicePdfService],
  exports: [ServiceSubscriptionsService],
})
export class ServiceSubscriptionsModule {}
