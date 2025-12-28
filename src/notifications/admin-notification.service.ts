import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminNotification } from './admin-notification.schema';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { PushTokenService } from './push-token.service';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Expo, ExpoPushMessage, ExpoPushTicket, ExpoPushReceipt } from 'expo-server-sdk';

interface DeliveryResult {
  success: boolean;
  token: string;
  ticketId?: string;
  error?: string;
}

@Injectable()
export class AdminNotificationService {
  private readonly logger = new Logger(AdminNotificationService.name);
  private readonly expo: Expo;

  constructor(
    @InjectModel(AdminNotification.name)
    private readonly adminNotificationModel: Model<AdminNotification>,
    private readonly pushTokenService: PushTokenService,
  ) {
    this.expo = new Expo();
  }

  /**
   * Create and send a notification
   */
  async createNotification(
    adminId: string,
    dto: CreateAdminNotificationDto,
  ): Promise<ISuccessResponse> {
    const { title, body, type, targetType, targetValue, scheduledAt, data } = dto;

    // Validate target value for non-all targets
    if (targetType !== 'all' && !targetValue) {
      throw new BadRequestException(
        `Target value is required for target type: ${targetType}`,
      );
    }

    // Create the notification record
    const notification = await this.adminNotificationModel.create({
      title,
      body,
      type,
      targetType,
      targetValue,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      data,
      createdBy: adminId,
      deliveryStats: { total: 0, delivered: 0, failed: 0 },
    });

    // If scheduled for future, don't send now
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      this.logger.log(
        `Notification ${notification._id} scheduled for ${scheduledAt}`,
      );
      return {
        success: true,
        message: 'Notification scheduled successfully',
        data: { id: notification._id, scheduled: true },
      };
    }

    // Send immediately
    const result = await this.sendNotification(notification._id.toString());

    return {
      success: true,
      message: 'Notification sent successfully',
      data: {
        id: notification._id,
        deliveryStats: result.deliveryStats,
      },
    };
  }

  /**
   * Send a notification to all targeted users
   */
  async sendNotification(notificationId: string): Promise<AdminNotification> {
    const notification = await this.adminNotificationModel.findById(notificationId);
    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    // Get all tokens for the target
    const targetedUsers = await this.pushTokenService.getTokensForTarget(
      notification.targetType,
      notification.targetValue,
    );

    // Flatten all tokens
    const allTokens: string[] = [];
    for (const user of targetedUsers) {
      allTokens.push(...user.tokens);
    }

    if (allTokens.length === 0) {
      this.logger.warn(`No push tokens found for notification ${notificationId}`);
      notification.sent = true;
      notification.sentAt = new Date();
      notification.deliveryStats = { total: 0, delivered: 0, failed: 0 };
      await notification.save();
      return notification;
    }

    // Send notifications in batches
    const results = await this.sendPushNotifications(
      allTokens,
      notification.title,
      notification.body,
      {
        type: notification.type,
        notificationId: notification._id.toString(),
        ...notification.data,
      },
    );

    // Update delivery stats
    const delivered = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const failedTokens = results
      .filter((r) => !r.success)
      .map((r) => r.token);

    notification.sent = true;
    notification.sentAt = new Date();
    notification.deliveryStats = {
      total: allTokens.length,
      delivered,
      failed,
    };
    notification.failedTokens = failedTokens;
    await notification.save();

    this.logger.log(
      `Notification ${notificationId} sent: ${delivered}/${allTokens.length} delivered`,
    );

    return notification;
  }

  /**
   * Send push notifications via Expo Push API with retry logic
   */
  private async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, any>,
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];

    // Filter valid Expo push tokens
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));
    const invalidTokens = tokens.filter((token) => !Expo.isExpoPushToken(token));

    // Mark invalid tokens as failed
    for (const token of invalidTokens) {
      results.push({ success: false, token, error: 'Invalid Expo push token' });
      await this.pushTokenService.deactivateToken(token);
    }

    if (validTokens.length === 0) {
      return results;
    }

    // Create messages
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = this.expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      const chunkResults = await this.sendChunkWithRetry(chunk, 3);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Send a chunk of notifications with exponential backoff retry
   */
  private async sendChunkWithRetry(
    chunk: ExpoPushMessage[],
    maxRetries: number,
  ): Promise<DeliveryResult[]> {
    const results: DeliveryResult[] = [];
    let retryCount = 0;
    let messagesToSend = [...chunk];

    while (messagesToSend.length > 0 && retryCount < maxRetries) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(messagesToSend);

        const failedMessages: ExpoPushMessage[] = [];

        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          const message = messagesToSend[i];
          const token = message.to as string;

          if (ticket.status === 'ok') {
            results.push({
              success: true,
              token,
              ticketId: ticket.id,
            });
          } else {
            // Check if it's a retryable error
            const error = (ticket as any).message || 'Unknown error';
            const isRetryable = this.isRetryableError(error);

            if (isRetryable && retryCount < maxRetries - 1) {
              failedMessages.push(message);
            } else {
              results.push({
                success: false,
                token,
                error,
              });

              // Deactivate token if it's a device-related error
              if (this.isDeviceError(error)) {
                await this.pushTokenService.deactivateToken(token);
              }
            }
          }
        }

        messagesToSend = failedMessages;

        if (messagesToSend.length > 0) {
          retryCount++;
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, retryCount - 1) * 1000;
          this.logger.log(
            `Retrying ${messagesToSend.length} notifications after ${delay}ms (attempt ${retryCount})`,
          );
          await this.sleep(delay);
        }
      } catch (error) {
        this.logger.error(`Error sending push notifications: ${error.message}`);

        if (retryCount < maxRetries - 1) {
          retryCount++;
          const delay = Math.pow(2, retryCount - 1) * 1000;
          await this.sleep(delay);
        } else {
          // Mark all remaining as failed
          for (const message of messagesToSend) {
            results.push({
              success: false,
              token: message.to as string,
              error: error.message,
            });
          }
          break;
        }
      }
    }

    return results;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: string): boolean {
    const retryableErrors = [
      'PUSH_TOO_MANY_EXPERIENCE_IDS',
      'PUSH_TOO_MANY_NOTIFICATIONS',
      'PUSH_TOO_MANY_RECEIPTS',
    ];
    return retryableErrors.some((e) => error.includes(e));
  }

  /**
   * Check if error indicates device/token issue
   */
  private isDeviceError(error: string): boolean {
    const deviceErrors = [
      'DeviceNotRegistered',
      'InvalidCredentials',
      'MessageTooBig',
      'MessageRateExceeded',
    ];
    return deviceErrors.some((e) => error.includes(e));
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get notification history with pagination
   */
  async getHistory(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const notifications = await this.adminNotificationModel
      .find()
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .select('-failedTokens'); // Exclude failed tokens from list view

    const totalItems = await this.adminNotificationModel.countDocuments();
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Notification history fetched successfully',
      data: {
        items: notifications,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  /**
   * Get delivery stats for a specific notification
   */
  async getStats(notificationId: string): Promise<ISuccessResponse> {
    const notification = await this.adminNotificationModel.findById(notificationId);

    if (!notification) {
      throw new BadRequestException('Notification not found');
    }

    return {
      success: true,
      message: 'Notification stats fetched successfully',
      data: {
        id: notification._id,
        title: notification.title,
        type: notification.type,
        targetType: notification.targetType,
        targetValue: notification.targetValue,
        sent: notification.sent,
        sentAt: notification.sentAt,
        deliveryStats: notification.deliveryStats,
        failedTokensCount: notification.failedTokens?.length || 0,
      },
    };
  }

  /**
   * Process scheduled notifications (called by cron job)
   */
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    const scheduledNotifications = await this.adminNotificationModel.find({
      sent: false,
      scheduledAt: { $lte: now },
    });

    this.logger.log(
      `Processing ${scheduledNotifications.length} scheduled notifications`,
    );

    for (const notification of scheduledNotifications) {
      try {
        await this.sendNotification(notification._id.toString());
      } catch (error) {
        this.logger.error(
          `Failed to send scheduled notification ${notification._id}: ${error.message}`,
        );
      }
    }
  }
}
