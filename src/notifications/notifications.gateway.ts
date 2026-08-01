import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { SOCKET_IO_CORS } from '../_global/constants/cors.constants';

@WebSocketGateway({ cors: SOCKET_IO_CORS })
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  async sendNotificationToUser(userId: string, notificationData: any) {
    this.server.to(`user:${userId}`).emit(`newNotification_${userId}`, notificationData);
  }

  async broadcastNewMessageNotification({ userId, ...others }: any) {
    const { data } = await this.notificationsService.create({ ...others, userId });

    // Emit the notification to the receiver
    this.sendNotificationToUser(userId, data);
  }
}
