import { Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './notification.schema';
import { Message } from '../chats/schema/message.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AdminRole, AllAdminRoles } from '../admin/admin.constant';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly moduleRef: ModuleRef,
  ) {}

  private ownerId(user: IJwtPayload): string {
    return AllAdminRoles.includes(user.role as AdminRole) ? 'admin' : user.id;
  }

  private emit(userId: string, notification: unknown): void {
    const gateway = this.moduleRef.get(NotificationsGateway, { strict: false });
    gateway?.sendNotificationToUser(userId, notification);
  }

  async create({
    type,
    content,
    typeId,
    userId,
    title,
    data,
  }: Notification): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { userId, typeId },
      { $setOnInsert: { type, content, typeId, userId, title, data, read: false } },
      { upsert: true, new: true },
    );

    this.emit(userId, notification);

    return {
      success: true,
      message: 'Notification created successfully',
      data: notification,
    };
  }

  async createForUsers({
    type,
    content,
    typeId,
    title,
    data,
    userIds,
  }: {
    type: Notification['type'];
    content: string;
    typeId: string;
    title?: string;
    data?: Record<string, unknown>;
    userIds: string[];
  }): Promise<ISuccessResponse> {
    const uniqueUserIds = Array.from(new Set(userIds));

    if (uniqueUserIds.length) {
      await this.notificationModel.bulkWrite(
        uniqueUserIds.map((userId) => ({
          updateOne: {
            filter: { userId, typeId },
            update: { $setOnInsert: { userId, type, content, typeId, title, data, read: false } },
            upsert: true,
          },
        })),
      );

      const created = await this.notificationModel.find({
        userId: { $in: uniqueUserIds },
        typeId,
      });
      created.forEach((notification) => this.emit(notification.userId, notification));
    }

    return {
      success: true,
      message: 'In-app notifications created successfully',
      data: { count: uniqueUserIds.length },
    };
  }

  async findAllNotifications(
    user: IJwtPayload,
    query: PaginationQueryDto,
  ): Promise<ISuccessResponse> {
    const { limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const userId = this.ownerId(user);

    const notifications = await this.notificationModel
      .find({ userId, deletedAt: { $exists: false } })
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.notificationModel.countDocuments({
      userId,
      deletedAt: { $exists: false },
    });
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

  async getNotificationsStats(user: IJwtPayload): Promise<ISuccessResponse> {
    const userId = this.ownerId(user);

    const unreadNotificationCount = await this.notificationModel.countDocuments({
      userId,
      read: false,
      deletedAt: { $exists: false },
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

  async getUnreadCount(user: IJwtPayload): Promise<ISuccessResponse> {
    const count = await this.notificationModel.countDocuments({
      userId: this.ownerId(user),
      read: false,
      deletedAt: { $exists: false },
    });
    return { success: true, message: 'Unread notification count fetched', data: { count } };
  }

  async findOneNotification(user: IJwtPayload, notificationId: string): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.findOne({
      _id: notificationId,
      userId: this.ownerId(user),
      deletedAt: { $exists: false },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return { success: true, message: 'Notification fetched successfully', data: notification };
  }

  async markAsRead(user: IJwtPayload, notificationId: string): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: this.ownerId(user), deletedAt: { $exists: false } },
      { read: true },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return {
      success: true,
      message: 'Notification marked as read',
      data: notification,
    };
  }

  async markAllAsRead(user: IJwtPayload): Promise<ISuccessResponse> {
    const result = await this.notificationModel.updateMany(
      { userId: this.ownerId(user), read: false, deletedAt: { $exists: false } },
      { read: true },
    );
    return {
      success: true,
      message: 'All notifications marked as read',
      data: { count: result.modifiedCount },
    };
  }

  async deleteNotification(user: IJwtPayload, notificationId: string): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        userId: this.ownerId(user),
        deletedAt: { $exists: false },
      },
      { deletedAt: new Date() },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  async restoreNotification(user: IJwtPayload, notificationId: string): Promise<ISuccessResponse> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId: this.ownerId(user), deletedAt: { $exists: true } },
      { $unset: { deletedAt: 1 } },
      { new: true },
    );
    if (!notification) throw new NotFoundException('Notification not found');
    return { success: true, message: 'Notification restored', data: notification };
  }
}
