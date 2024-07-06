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

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
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
}
