import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { Model } from 'mongoose';
import { Message } from './schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from '../users/users.schema';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AdminRole, AllAdminRoles } from '../admin/admin.constant';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async findAllContacts(user: IJwtPayload): Promise<ISuccessResponse> {
    let contacts: any;
    if (AllAdminRoles.includes(user.role as AdminRole)) {
      contacts = await this.chatLogModel
        .find({ chatWith: 'admin' })
        .sort({ updatedAt: -1 })
        .populate({ path: 'user', model: this.userModel });
    } else {
      contacts = await this.chatLogModel
        .find({ user: user.id, chatWith: { $ne: 'admin' } }) // Exclude 'admin'
        .sort({ updatedAt: -1 })
        .populate({ path: 'chatWith', model: this.userModel }); // Populate with user details
    }

    return {
      success: true,
      message: 'Contacts fetched successfully',
      data: contacts,
    };
  }

  async getChatHistory(user: IJwtPayload, chatWithId: string): Promise<ISuccessResponse> {
    let messages: any;
    if (AllAdminRoles.includes(user.role as AdminRole)) {
      messages = await this.messageModel.find({
        $or: [
          { sender: 'admin', receiver: chatWithId },
          { sender: chatWithId, receiver: 'admin' },
        ],
      });
    } else {
      messages = await this.messageModel.find({
        $or: [
          { sender: user.id, receiver: chatWithId },
          { sender: chatWithId, receiver: user.id },
        ],
      });
    }

    return {
      success: true,
      message: 'Chat history fetched successfully',
      data: messages,
    };
  }
}
