import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { Model } from 'mongoose';
import { Message } from './schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from '../users/schema/users.schema';
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
    let [adminUnreadCount, adminLastMessage] = [0, ''];

    if (AllAdminRoles.includes(user.role as AdminRole)) {
      contacts = await this.chatLogModel
        .find({ chatWith: 'admin' })
        .sort({ updatedAt: -1 })
        .populate({ path: 'user', model: this.userModel })
        .lean();

      // Aggregate unread counts for each contact in one query
      const unreadCounts = await this.messageModel.aggregate([
        { $match: { receiver: 'admin', read: false } },
        { $group: { _id: '$sender', count: { $sum: 1 } } },
      ]);

      // Create a map of counts by user id for fast access
      const unreadCountMap = unreadCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
      }, {});

      // Assign unread counts to contacts
      contacts.forEach((contact) => {
        contact.unreadCount = unreadCountMap[contact.user?._id.toString()] || 0;
      });
    } else {
      contacts = await this.chatLogModel
        .find({ user: user.id, chatWith: { $ne: 'admin' } })
        .sort({ updatedAt: -1 })
        .populate({ path: 'chatWith', model: this.userModel })
        .lean();

      adminUnreadCount = await this.messageModel.countDocuments({
        sender: 'admin',
        receiver: user.id,
        read: false,
      });
      const lastMessage = await this.messageModel
        .findOne({
          $or: [
            { sender: 'admin', receiver: user.id },
            { sender: user.id, receiver: 'admin' },
          ],
        })
        .sort({ createdAt: -1 });
      adminLastMessage = lastMessage?.content;

      // Aggregate unread counts for each contact in one query
      const unreadCounts = await this.messageModel.aggregate([
        { $match: { receiver: user.id, read: false } },
        { $group: { _id: '$sender', count: { $sum: 1 } } },
      ]);

      // Create a map of counts by user id for fast access
      const unreadCountMap = unreadCounts.reduce((acc, item) => {
        acc[item._id.toString()] = item.count;
        return acc;
      }, {});

      // Assign unread counts to contacts
      contacts.forEach((contact) => {
        contact.unreadCount = unreadCountMap[contact.chatWith?._id.toString()] || 0;
      });
    }

    return {
      success: true,
      message: 'Contacts fetched successfully',
      data: {
        contacts,
        adminUnreadCount,
        adminLastMessage,
      },
    };
  }

  async getChatHistory(user: IJwtPayload, chatWithId: string): Promise<ISuccessResponse> {
    let messages: any;
    if (AllAdminRoles.includes(user.role as AdminRole)) {
      // mark all recieved messages from chatWith as read here
      await this.messageModel.updateMany({ sender: chatWithId, receiver: 'admin' }, { read: true });
      const adminCriteria = {
        $or: [
          { sender: 'admin', receiver: chatWithId },
          { sender: chatWithId, receiver: 'admin' },
        ],
      };
      messages = await this.messageModel.find(adminCriteria);
    } else {
      // mark all recieved messages from chatWith as read here
      await this.messageModel.updateMany({ sender: chatWithId, receiver: user.id }, { read: true });
      // user
      const userCriteria = {
        $or: [
          { sender: user.id, receiver: chatWithId },
          { sender: chatWithId, receiver: user.id },
        ],
      };
      messages = await this.messageModel.find(userCriteria);
    }

    return {
      success: true,
      message: 'Chat history fetched successfully',
      data: messages,
    };
  }
}
