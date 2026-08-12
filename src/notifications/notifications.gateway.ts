import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Inject, Optional, forwardRef } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { SOCKET_IO_CORS } from '../_global/constants/cors.constants';
import { RabbitMqService } from '../queue/rabbitmq.service';

@WebSocketGateway({ cors: SOCKET_IO_CORS, transports: ['websocket'] })
export class NotificationsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Optional() private readonly rabbitMq?: RabbitMqService,
  ) {}

  async afterInit() {
    if (process.env.PROCESS_ROLE === 'worker') return;
    const subscribe = async () =>
      this.rabbitMq?.consumeRealtime(async (message) => {
      const room = this.server.to(`user:${message.userId}`);
      room.emit(message.event, message.payload);
      if (message.legacyEvent) room.emit(message.legacyEvent, message.payload);
    });
    if (!(await subscribe())) {
      const retry = setInterval(async () => {
        if (await subscribe()) clearInterval(retry);
      }, 30_000);
      retry.unref();
    }
  }

  async sendNotificationToUser(userId: string, notificationData: any) {
    if (process.env.PROCESS_ROLE === 'worker') {
      await this.rabbitMq?.publishRealtime({
        userId,
        event: 'notification:new',
        legacyEvent: `newNotification_${userId}`,
        payload: notificationData,
      });
      return;
    }
    const room = this.server.to(`user:${userId}`);
    room.emit('notification:new', notificationData);
    room.emit(`newNotification_${userId}`, notificationData);
  }

  async broadcastNewMessageNotification({ userId, ...others }: any) {
    const { data } = await this.notificationsService.create({ ...others, userId });

    // Emit the notification to the receiver
    this.sendNotificationToUser(userId, data);
  }
}
