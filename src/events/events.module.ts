import { forwardRef, Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './events.schema';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PaystackModule } from '../paystack/paystack.module';
import { User, UserSchema } from '../users/schema/users.schema';
import { PaypalModule } from '../paypal/paypal.module';
import { EmailModule } from '../email/email.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  EventRegistrationDraft,
  EventRegistrationDraftSchema,
} from './event-registration-draft.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
      { name: EventRegistrationDraft.name, schema: EventRegistrationDraftSchema },
    ]),
    CloudinaryModule,
    EmailModule,
    forwardRef(() => PaystackModule),
    PaypalModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
