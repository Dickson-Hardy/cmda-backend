import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { Message } from '../chats/schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AdminRole, AllAdminRoles } from '../admin/admin.constant';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
  ) {}

  async create({ type, content, typeId, userId }: Notification): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.create({ type, content, typeId, userId });

    return {
      success: true,
      message: 'Notification created successfully',
      data: notification,
    };
  }

  async findAllNotifications(
    user: IJwtPayload,
    query: PaginationQueryDto,
  ): Promise<ISuccessResponse> {
    const { limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const userId = AllAdminRoles.includes(user.role as AdminRole) ? 'admin' : user.id;

    const notifications = await this.notificationModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.notificationModel.countDocuments({});
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Notifications fetched successfully',
      data: {
        items: notifications,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async getNotificationsStats(userId: string): Promise<ISuccessResponse> {
    const unreadNotificationCount = await this.notificationModel.countDocuments({
      userId,
      read: false,
    });

    const unreadMessagesCount = await this.messageModel.countDocuments({
      receiver: userId,
      read: false,
    });

    return {
      success: true,
      message: 'Notification stats fetched successfully',
      data: { unreadNotificationCount, unreadMessagesCount },
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<ISuccessResponse> {
    await this.notificationModel.findOneAndUpdate({ _id: notificationId, userId }, { read: true });
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }
}
