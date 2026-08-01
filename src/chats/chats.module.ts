import { Module } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatsController } from './chats.controller';
import { ChatGateway } from './chat.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schema/message.schema';
import { ChatLog, ChatLogSchema } from './schema/chat-log.schema';
import { User, UserSchema } from '../users/schema/users.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { ChatBlock, ChatBlockSchema } from './schema/chat-block.schema';
import { MessageReport, MessageReportSchema } from './schema/message-report.schema';
import { ChatOutbox, ChatOutboxSchema } from './schema/chat-outbox.schema';
import { ChatOutboxProcessor } from './chat-outbox.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: ChatLog.name, schema: ChatLogSchema },
      { name: User.name, schema: UserSchema },
      { name: ChatBlock.name, schema: ChatBlockSchema },
      { name: MessageReport.name, schema: MessageReportSchema },
      { name: ChatOutbox.name, schema: ChatOutboxSchema },
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatGateway, ChatOutboxProcessor],
})
export class ChatsModule {}
