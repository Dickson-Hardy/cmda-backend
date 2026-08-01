import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ChatLog } from './schema/chat-log.schema';
import { Model } from 'mongoose';
import { Message } from './schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from '../users/schema/users.schema';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AdminRole, AllAdminRoles } from '../admin/admin.constant';
import { ChatBlock } from './schema/chat-block.schema';
import { MessageReport } from './schema/message-report.schema';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(ChatBlock.name) private readonly chatBlockModel: Model<ChatBlock>,
    @InjectModel(MessageReport.name) private readonly reportModel: Model<MessageReport>,
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

  async getChatHistory(
    user: IJwtPayload,
    chatWithId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<ISuccessResponse> {
    const skip = (page - 1) * limit;
    let messages: any;
    let total: number;

    if (AllAdminRoles.includes(user.role as AdminRole)) {
      // mark all recieved messages from chatWith as read here
      await this.messageModel.updateMany({ sender: chatWithId, receiver: 'admin' }, { read: true });
      const adminCriteria = {
        $or: [
          { sender: 'admin', receiver: chatWithId },
          { sender: chatWithId, receiver: 'admin' },
        ],
      };
      total = await this.messageModel.countDocuments(adminCriteria);
      messages = await this.messageModel
        .find(adminCriteria)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
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
      total = await this.messageModel.countDocuments(userCriteria);
      messages = await this.messageModel
        .find(userCriteria)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    // Reverse so oldest is first (we fetched newest-first for pagination)
    messages.reverse();

    return {
      success: true,
      message: 'Chat history fetched successfully',
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + messages.length < total,
        },
      },
    };
  }

  async getBlockedUsers(user: IJwtPayload): Promise<ISuccessResponse> {
    this.assertMember(user);
    const blocks = await this.chatBlockModel
      .find({ blocker: user.id })
      .populate({ path: 'blocked', model: this.userModel, select: 'fullName email avatarUrl' })
      .sort({ createdAt: -1 })
      .lean();
    return { success: true, message: 'Blocked users fetched successfully', data: blocks };
  }

  async blockUser(user: IJwtPayload, targetId: string): Promise<ISuccessResponse> {
    this.assertMember(user);
    if (user.id === targetId) throw new BadRequestException('You cannot block yourself');
    if (!(await this.userModel.exists({ _id: targetId }))) {
      throw new NotFoundException('Member not found');
    }
    await this.chatBlockModel.updateOne(
      { blocker: user.id, blocked: targetId },
      { $setOnInsert: { blocker: user.id, blocked: targetId } },
      { upsert: true },
    );
    return { success: true, message: 'Member blocked successfully' };
  }

  async unblockUser(user: IJwtPayload, targetId: string): Promise<ISuccessResponse> {
    this.assertMember(user);
    await this.chatBlockModel.deleteOne({ blocker: user.id, blocked: targetId });
    return { success: true, message: 'Member unblocked successfully' };
  }

  async reportMessage(
    user: IJwtPayload,
    messageId: string,
    reason: string,
  ): Promise<ISuccessResponse> {
    this.assertMember(user);
    const message = await this.messageModel.findById(messageId).lean();
    if (!message) throw new NotFoundException('Message not found');
    if (message.sender !== user.id && message.receiver !== user.id) {
      throw new ForbiddenException('You cannot report this message');
    }
    await this.reportModel.updateOne(
      { message: messageId, reporter: user.id },
      { $setOnInsert: { message: messageId, reporter: user.id, reason, status: 'pending' } },
      { upsert: true },
    );
    return { success: true, message: 'Message reported for review' };
  }

  private assertMember(user: IJwtPayload) {
    if (AllAdminRoles.includes(user.role as AdminRole)) {
      throw new ForbiddenException('This action is only available to members');
    }
  }
}
