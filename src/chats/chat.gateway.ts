import { InjectModel } from '@nestjs/mongoose';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Message } from './schema/message.schema';
import { Model } from 'mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { User } from '../users/schema/users.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.constant';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @SubscribeMessage('newMessage')
  async handleMessage(@MessageBody() data: { sender: string; receiver: string; content: string }) {
    const { sender, receiver, content } = data;

    const newMessage = await this.messageModel.create({ sender, receiver, content });

    await this.chatLogModel.findOneAndUpdate(
      { user: sender, chatWith: receiver },
      { lastMessage: content },
      { upsert: true, new: true },
    );

    await this.chatLogModel.findOneAndUpdate(
      { user: receiver, chatWith: sender },
      { lastMessage: content },
      { upsert: true, new: true },
    );

    this.server.emit(`newMessage_${[sender, receiver].sort().join('_')}`, newMessage);

    // Don't crash chat if notification fails (e.g. admin receiver or missing user)
    try {
      if (receiver !== 'admin') {
        const senderUser = await this.userModel.findById(sender).lean();
        const senderName =
          senderUser?.fullName || (sender === 'admin' ? 'Admin' : 'Someone');

        await this.notificationsGateway.broadcastNewMessageNotification({
          userId: receiver,
          type: NotificationType.MESSAGE,
          typeId: newMessage._id,
          content: `You have a new message from ${senderName} with body: "${newMessage.content}"`,
        });
      }
    } catch (err) {
      console.error('[ChatGateway] Failed to broadcast message notification:', err);
    }
  }

  //  admin sending broadcast message to selected users
  @SubscribeMessage('broadcastMessage')
  async handleBroadcast(
    @MessageBody()
    data: {
      receiverCriteria: { role: string; region: string; searchBy: string };
      content: string;
    },
  ) {
    const sender = 'admin';
    const { receiverCriteria, content } = data;
    const { role, region, searchBy } = receiverCriteria;

    const searchCriteria: any = {};
    if (searchBy) {
      searchCriteria.$or = [
        { firstName: new RegExp(searchBy, 'i') },
        { middleName: new RegExp(searchBy, 'i') },
        { lastName: new RegExp(searchBy, 'i') },
        { email: new RegExp(searchBy, 'i') },
        { specialty: new RegExp(searchBy, 'i') },
        { licenseNumber: new RegExp(searchBy, 'i') },
        { membershipId: new RegExp(searchBy, 'i') },
      ];
    }
    if (role) searchCriteria.role = role;
    if (region) searchCriteria.region = region;

    const receivers = await this.userModel.find(searchCriteria).lean();
    const BATCH_SIZE = 50;

    // Process receivers in batches to avoid overwhelming the database
    for (let i = 0; i < receivers.length; i += BATCH_SIZE) {
      const batch = receivers.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (receiver) => {
          try {
            const newMessage = await this.messageModel.create({ sender, receiver: receiver._id, content });

            await Promise.all([
              this.chatLogModel.findOneAndUpdate(
                { user: sender, chatWith: receiver._id },
                { lastMessage: content },
                { upsert: true, new: true },
              ),
              this.chatLogModel.findOneAndUpdate(
                { user: receiver._id, chatWith: sender },
                { lastMessage: content },
                { upsert: true, new: true },
              ),
            ]);

            this.server.emit(`newMessage_${['admin', receiver._id].sort().join('_')}`, newMessage);

            await this.notificationsGateway.broadcastNewMessageNotification({
              userId: receiver._id,
              type: NotificationType.MESSAGE,
              typeId: newMessage._id,
              content: `You have a new message from Admin with body: "${newMessage.content}"`,
            });
          } catch (error) {
            console.error(`Failed to send broadcast message to ${receiver._id}:`, error.message);
          }
        }),
      );
    }
  }
}
