import { forwardRef, Module } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import { DonationsModule } from '../donations/donations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EventsModule } from '../events/events.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    forwardRef(() => DonationsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => EventsModule),
    forwardRef(() => OrdersModule),
  ],
  providers: [PaystackService],
  exports: [PaystackService],
  controllers: [PaystackController],
})
export class PaystackModule {}
