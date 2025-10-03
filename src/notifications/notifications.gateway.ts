import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  async sendNotificationToUser(userId: string, notificationData: any) {
    this.server.emit(`newNotification_${userId}`, notificationData);
  }

  async broadcastNewMessageNotification({ userId, ...others }: any) {
    const { data } = await this.notificationsService.create({ ...others, userId });

    // Emit the notification to the receiver
    this.sendNotificationToUser(userId, data);
  }
}
