import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Donation, DonationShema } from './donation.schema';
import { User, UserSchema } from '../users/schema/users.schema';
import { PaystackModule } from '../paystack/paystack.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Donation.name, schema: DonationShema },
      { name: User.name, schema: UserSchema },
    ]),
    PaystackModule,
    EmailModule,
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
})
export class DonationsModule {}
