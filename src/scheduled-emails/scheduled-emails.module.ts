import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledEmailsService } from './scheduled-emails.service';
import { ScheduledEmailsController } from './scheduled-emails.controller';
import { User, UserSchema } from '../users/schema/users.schema';
import { Event, EventSchema } from '../events/events.schema';
import { EmailModule } from '../email/email.module';
import {
  ScheduledEmailSend,
  ScheduledEmailSendSchema,
} from './scheduled-email-send.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
      { name: ScheduledEmailSend.name, schema: ScheduledEmailSendSchema },
    ]),
    EmailModule,
  ],
  controllers: [ScheduledEmailsController],
  providers: [ScheduledEmailsService],
  exports: [ScheduledEmailsService],
})
export class ScheduledEmailsModule {}
