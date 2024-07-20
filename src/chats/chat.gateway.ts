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

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
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

    receivers
      .map((receiver) => receiver._id)
      .forEach(async (receiver) => {
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

        this.server.emit(`newMessage_${['admin', receiver].sort().join('_')}`, newMessage);
      });
  }
}
