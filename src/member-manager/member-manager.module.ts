import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MemberManagerController } from './member-manager.controller';
import { MemberManagerService } from './member-manager.service';
import { MemberNote, MemberNoteSchema } from './schemas/member-note.schema';
import { CommunicationLog, CommunicationLogSchema } from './schemas/communication-log.schema';
import { FollowUp, FollowUpSchema } from './schemas/follow-up.schema';
import { Ticket, TicketSchema } from './schemas/ticket.schema';
import { EmailTemplate, EmailTemplateSchema } from './schemas/email-template.schema';
import { Task, TaskSchema } from './schemas/task.schema';
import { ModerationLog, ModerationLogSchema } from './schemas/moderation-log.schema';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';
import { User, UserSchema } from '../users/schema/users.schema';
import { UsersModule } from '../users/users.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EmailModule } from '../email/email.module';
import { ChatsModule } from '../chats/chats.module';
import { DevotionalsModule } from '../devotionals/devotionals.module';
import { ResourcesModule } from '../resources/resources.module';
import { DonationsModule } from '../donations/donations.module';
import { OrdersModule } from '../orders/orders.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberNote.name, schema: MemberNoteSchema },
      { name: CommunicationLog.name, schema: CommunicationLogSchema },
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: Ticket.name, schema: TicketSchema },
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: Task.name, schema: TaskSchema },
      { name: ModerationLog.name, schema: ModerationLogSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    EmailModule,
    ChatsModule,
    DevotionalsModule,
    ResourcesModule,
    DonationsModule,
    OrdersModule,
  ],
  controllers: [MemberManagerController],
  providers: [MemberManagerService],
  exports: [MemberManagerService],
})
export class MemberManagerModule {}
