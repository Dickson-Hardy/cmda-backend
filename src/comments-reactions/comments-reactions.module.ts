import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentsReactionsService } from './comments-reactions.service';
import { CommentsReactionsController } from './comments-reactions.controller';
import { Comment, CommentSchema } from './comment.schema';
import { Reaction, ReactionSchema } from './reaction.schema';
import { EventFeedback, EventFeedbackSchema } from './event-feedback.schema';
import { PersonalEvent, PersonalEventSchema } from './personal-event.schema';
import { EventReminder, EventReminderSchema } from './event-reminder.schema';
import { Event, EventSchema } from '../events/events.schema';
import { User, UserSchema } from '../users/schema/users.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comment.name, schema: CommentSchema },
      { name: Reaction.name, schema: ReactionSchema },
      { name: EventFeedback.name, schema: EventFeedbackSchema },
      { name: PersonalEvent.name, schema: PersonalEventSchema },
      { name: EventReminder.name, schema: EventReminderSchema },
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CommentsReactionsController],
  providers: [CommentsReactionsService],
  exports: [CommentsReactionsService],
})
export class CommentsReactionsModule {}
