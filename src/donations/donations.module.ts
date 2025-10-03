import { forwardRef, Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Donation, DonationShema } from './donation.schema';
import { User, UserSchema } from '../users/schema/users.schema';
import { PaystackModule } from '../paystack/paystack.module';
import { EmailModule } from '../email/email.module';
import { PaypalModule } from '../paypal/paypal.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationShema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => PaystackModule),
    EmailModule,
    PaypalModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
