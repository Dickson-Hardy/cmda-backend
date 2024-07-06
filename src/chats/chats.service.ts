import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { Model } from 'mongoose';
import { Message } from './schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) {}

  async findAllContacts(id: string): Promise<ISuccessResponse> {
    const contacts = await this.chatLogModel
      .find({ user: id })
      .sort({ createdAt: -1 })
      .populate('chatWith');

    return {
      success: true,
      message: 'Contacts fetched successfully',
      data: contacts,
    };
  }

  async getChatHistory(userId: string, chatWithId: string): Promise<ISuccessResponse> {
    const messages = await this.messageModel.find({
      $or: [
        { sender: userId, receiver: chatWithId },
        { sender: chatWithId, receiver: userId },
      ],
    });
    return {
      success: true,
      message: 'Chat history fetched successfully',
      data: messages,
    };
  }
}
