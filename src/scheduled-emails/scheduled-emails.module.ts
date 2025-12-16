import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduledEmailsService } from './scheduled-emails.service';
import { ScheduledEmailsController } from './scheduled-emails.controller';
import { User, UserSchema } from '../users/schema/users.schema';
import { Event, EventSchema } from '../events/events.schema';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
    ]),
    EmailModule,
  ],
  controllers: [ScheduledEmailsController],
  providers: [ScheduledEmailsService],
  exports: [ScheduledEmailsService],
})
export class ScheduledEmailsModule {}
