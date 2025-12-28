import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './notification.schema';
import { Message, MessageSchema } from '../chats/schema/message.schema';
import { NotificationsController } from './notifications.controller';
import { PushToken, PushTokenSchema } from './push-token.schema';
import { PushTokenService } from './push-token.service';
import { User, UserSchema } from '../users/schema/users.schema';
import { AdminNotification, AdminNotificationSchema } from './admin-notification.schema';
import { AdminNotificationService } from './admin-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: PushToken.name, schema: PushTokenSchema },
      { name: User.name, schema: UserSchema },
      { name: AdminNotification.name, schema: AdminNotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsGateway, NotificationsService, PushTokenService, AdminNotificationService],
  exports: [NotificationsGateway, PushTokenService, AdminNotificationService],
})
export class NotificationsModule {}
