import { forwardRef, Module } from '@nestjs/common';
import { PaystackService } from './paystack.service';
import { PaystackController } from './paystack.controller';
import { DonationsModule } from '../donations/donations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    forwardRef(() => DonationsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => EventsModule),
  ],
  providers: [PaystackService],
  exports: [PaystackService],
  controllers: [PaystackController],
})
export class PaystackModule {}
