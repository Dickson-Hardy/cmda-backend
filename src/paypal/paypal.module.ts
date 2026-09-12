import { forwardRef, Module } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { PaypalController } from './paypal.controller';
import { DonationsModule } from '../donations/donations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { OrdersModule } from '../orders/orders.module';
import { EventsModule } from '../events/events.module';
import { PaymentIntentsModule } from '../payment-intents/payment-intents.module';

@Module({
  imports: [
    forwardRef(() => DonationsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => OrdersModule),
    forwardRef(() => EventsModule),
    forwardRef(() => PaymentIntentsModule),
  ],
  controllers: [PaypalController],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
