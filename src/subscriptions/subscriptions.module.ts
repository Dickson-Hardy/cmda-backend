import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription } from 'rxjs';
import { SubscriptionShema } from './subscription.schema';
import { User, UserSchema } from '../users/schema/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionShema },
      { name: User.name, schema: UserSchema },
    ]),
    PaystackModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
