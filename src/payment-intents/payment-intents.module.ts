import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentIntent, PaymentIntentSchema } from './payment-intent.schema';
import { PaymentIntentsService } from './payment-intents.service';
import { PaymentIntentsController } from './payment-intents.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { DonationsModule } from '../donations/donations.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PaymentIntent.name, schema: PaymentIntentSchema }]),
    forwardRef(() => PaystackModule),
    forwardRef(() => DonationsModule),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaymentIntentsController],
  providers: [PaymentIntentsService],
  exports: [PaymentIntentsService],
})
export class PaymentIntentsModule {}
