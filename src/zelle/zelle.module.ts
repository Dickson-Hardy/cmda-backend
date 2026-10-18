import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ZelleSettings, ZelleSettingsSchema } from './zelle-settings.schema';
import { PaymentIntent, PaymentIntentSchema } from '../payment-intents/payment-intent.schema';
import { User, UserSchema } from '../users/schema/users.schema';
import { Donation, DonationShema } from '../donations/donation.schema';
import { PaymentIntentsModule } from '../payment-intents/payment-intents.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ZelleController } from './zelle.controller';
import { ZelleService } from './zelle.service';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ZelleSettings.name, schema: ZelleSettingsSchema },
      { name: PaymentIntent.name, schema: PaymentIntentSchema },
      { name: User.name, schema: UserSchema },
      { name: Donation.name, schema: DonationShema },
    ]),
    PaymentIntentsModule,
    SubscriptionsModule,
    CloudinaryModule,
  ],
  controllers: [ZelleController],
  providers: [ZelleService],
})
export class ZelleModule {}
