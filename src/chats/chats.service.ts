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
import { escapeRegex } from '../_common/escape-regex.util';

@Injectable()
export class ChatsService {
  constructor(
    @InjectModel(ChatLog.name) private readonly chatLogModel: Model<ChatLog>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(ChatBlock.name) private readonly chatBlockModel: Model<ChatBlock>,
    @InjectModel(MessageReport.name) private readonly reportModel: Model<MessageReport>,
  ) {}

  async findAllContacts(
    user: IJwtPayload,
    query: { page: number; limit: number; search?: string },
  ): Promise<ISuccessResponse> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    let contacts: any;
    let total = 0;
    let [adminUnreadCount, adminLastMessage] = [0, ''];

    // Only populate essential fields to reduce memory usage
    const userFields = '_id fullName avatarUrl';

    if (AllAdminRoles.includes(user.role as AdminRole)) {
      // Build match query for search
      const matchQuery: any = { chatWith: 'admin' };

      if (search) {
        // Find users matching search first
        const matchingUsers = await this.userModel
          .find({ fullName: { $regex: escapeRegex(search), $options: 'i' } })
          .select('_id')
          .lean();
        matchQuery.user = { $in: matchingUsers.map((u) => u._id) };
      }

      total = await this.chatLogModel.countDocuments(matchQuery);

      contacts = await this.chatLogModel
        .find(matchQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'user', model: this.userModel, select: userFields })
        .lean();

      // Only aggregate unread counts for the current page of contacts
      const contactUserIds = contacts
        .map((c) => c.user?._id)
        .filter(Boolean);

      if (contactUserIds.length > 0) {
        const unreadCounts = await this.messageModel.aggregate([
          { $match: { receiver: 'admin', read: false, sender: { $in: contactUserIds } } },
          { $group: { _id: '$sender', count: { $sum: 1 } } },
        ]);

        const unreadCountMap = unreadCounts.reduce((acc, item) => {
          acc[item._id.toString()] = item.count;
          return acc;
        }, {});

        contacts.forEach((contact) => {
          contact.unreadCount = unreadCountMap[contact.user?._id.toString()] || 0;
        });
      }
    } else {
      const matchQuery: any = { user: user.id, chatWith: { $ne: 'admin' } };

      if (search) {
        const matchingUsers = await this.userModel
          .find({ fullName: { $regex: escapeRegex(search), $options: 'i' } })
          .select('_id')
          .lean();
        matchQuery.chatWith = { $in: matchingUsers.map((u) => u._id) };
      }

      total = await this.chatLogModel.countDocuments(matchQuery);

      contacts = await this.chatLogModel
        .find(matchQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: 'chatWith', model: this.userModel, select: userFields })
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

      // Only aggregate unread counts for current page contacts
      const contactUserIds = contacts
        .map((c) => c.chatWith?._id)
        .filter(Boolean);

      if (contactUserIds.length > 0) {
        const unreadCounts = await this.messageModel.aggregate([
          { $match: { receiver: user.id, read: false, sender: { $in: contactUserIds } } },
          { $group: { _id: '$sender', count: { $sum: 1 } } },
        ]);

        const unreadCountMap = unreadCounts.reduce((acc, item) => {
          acc[item._id.toString()] = item.count;
          return acc;
        }, {});

        contacts.forEach((contact) => {
          contact.unreadCount = unreadCountMap[contact.chatWith?._id.toString()] || 0;
        });
      }
    }

    return {
      success: true,
      message: 'Contacts fetched successfully',
      data: {
        contacts,
        adminUnreadCount,
        adminLastMessage,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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
      .populate({ path: 'blocked', model: this.userModel, select: 'fullName avatarUrl' })
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
