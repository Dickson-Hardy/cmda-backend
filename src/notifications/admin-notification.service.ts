import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminNotification } from './admin-notification.schema';
import { CreateAdminNotificationDto } from './dto/create-admin-notification.dto';
import { PushTokenService } from './push-token.service';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { NotificationsService } from './notifications.service';
import { NotificationType as InAppNotificationType } from './notification.constant';
import { PushDelivery } from './push-delivery.schema';
import { NotificationOutbox } from './notification-outbox.schema';

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
  private readonly allowedDataKeys = new Set([
    'type',
    'notificationId',
    'eventId',
    'eventSlug',
    'slug',
    'orderId',
    'paymentId',
    'subscriptionId',
    'donationId',
    'trainingId',
    'volunteerId',
    'messageId',
    'senderId',
    'senderName',
    'screen',
  ]);

  constructor(
    @InjectModel(AdminNotification.name)
    private readonly adminNotificationModel: Model<AdminNotification>,
    @InjectModel(PushDelivery.name)
    private readonly pushDeliveryModel: Model<PushDelivery>,
    @InjectModel(NotificationOutbox.name)
    private readonly notificationOutboxModel: Model<NotificationOutbox>,
    private readonly pushTokenService: PushTokenService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.expo = new Expo();
  }

  async sendChatMessagePush(params: {
    userId: string;
    senderId: string;
    senderName: string;
    messageId: string;
    content: string;
  }): Promise<{ total: number; delivered: number; failed: number }> {
    const targetedUsers = await this.pushTokenService.getTokensForTarget(
      'user',
      params.userId,
      'newMessage',
    );
    const tokens = targetedUsers.flatMap((user) => user.tokens);

    if (!tokens.length) {
      this.logger.warn(`No push tokens found for chat message ${params.messageId}`);
      return { total: 0, delivered: 0, failed: 0 };
    }

    const results = await this.sendPushNotifications(
      tokens,
      `New message from ${params.senderName}`,
      'You have a new private message. Open CMDA to read it.',
      {
        type: 'message_received',
        messageId: params.messageId,
        senderId: params.senderId,
        senderName: params.senderName,
      },
    );

    return {
      total: results.length,
      delivered: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
    };
  }

  /**
   * Create and send a notification
   */
  async createNotification(
    adminId: string,
    dto: CreateAdminNotificationDto,
  ): Promise<ISuccessResponse> {
    const { title, body, type, targetType, targetValue, scheduledAt } = dto;
    const data = this.sanitizeData(dto.data);

    // Validate target value for non-all targets
    if (targetType !== 'all' && !targetValue) {
      throw new BadRequestException(`Target value is required for target type: ${targetType}`);
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
      this.logger.log(`Notification ${notification._id} scheduled for ${scheduledAt}`);
      return {
        success: true,
        message: 'Notification scheduled successfully',
        data: { id: notification._id, scheduled: true },
      };
    }

    // Send immediately
    let result: AdminNotification;
    try {
      result = await this.sendNotification(notification._id.toString());
    } catch (error) {
      await this.adminNotificationModel.updateOne(
        { _id: notification._id },
        { $set: { processing: false }, $inc: { retryCount: 1 } },
      );
      throw error;
    }

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
    const staleClaim = new Date(Date.now() - 10 * 60 * 1000);
    const notification = await this.adminNotificationModel.findOneAndUpdate(
      {
        _id: notificationId,
        sent: false,
        $or: [
          { processing: false },
          { processing: { $exists: false } },
          { processingAt: { $lt: staleClaim } },
        ],
      },
      { processing: true, processingAt: new Date() },
      { new: true },
    );
    if (!notification) {
      const existing = await this.adminNotificationModel.findById(notificationId);
      if (existing?.sent || existing?.processing) return existing;
      throw new BadRequestException('Notification not found');
    }

    const preference = this.preferenceForType(notification.type);
    const inAppUserIds = await this.pushTokenService.getTargetUserIds(
      notification.targetType,
      notification.targetValue,
      false,
      preference,
    );
    const targetedUsers = await this.pushTokenService.getTokensForTarget(
      notification.targetType,
      notification.targetValue,
      preference,
    );

    // The bell is backed by the Notification collection, not Expo delivery.
    // Persist an idempotent in-app item for every targeted user, including
    // users without a currently registered push token.
    const inAppResult = await this.notificationsService.createForUsers({
      type: notification.type as unknown as InAppNotificationType,
      content: notification.body,
      typeId: notification._id.toString(),
      title: notification.title,
      data: {
        ...notification.data,
        type: notification.type,
      },
      userIds: inAppUserIds,
    });

    const recipientNotifications =
      (
        inAppResult.data as {
          items?: { userId: string; notificationId: string }[];
        }
      )?.items || [];
    const notificationIdByUser = new Map(
      recipientNotifications.map((item) => [item.userId, item.notificationId]),
    );

    // Flatten all tokens
    const allTokens: string[] = [];
    const recipientDataByToken = new Map<string, Record<string, unknown>>();
    for (const user of targetedUsers) {
      const recipientNotificationId = notificationIdByUser.get(user.userId);
      for (const token of user.tokens) {
        allTokens.push(token);
        if (recipientNotificationId) {
          recipientDataByToken.set(token, {
            notificationId: recipientNotificationId,
          });
        }
      }
    }

    if (allTokens.length === 0) {
      this.logger.warn(`No push tokens found for notification ${notificationId}`);
      notification.sent = true;
      notification.processing = false;
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
        ...notification.data,
        type: notification.type,
      },
      notification._id.toString(),
      recipientDataByToken,
    );

    // Update delivery stats
    const accepted = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const failedTokens = results.filter((r) => !r.success).map((r) => r.token);

    await this.pushDeliveryModel.bulkWrite(
      results.map((result) => ({
        updateOne: {
          filter: { notificationId: notification._id.toString(), token: result.token },
          update: {
            $set: {
              ticketId: result.ticketId,
              status: result.success ? 'accepted' : 'failed',
              error: result.error,
            },
            $inc: { attempts: 1 },
          },
          upsert: true,
        },
      })),
    );

    notification.sent = true;
    notification.processing = false;
    notification.sentAt = new Date();
    notification.deliveryStats = {
      total: allTokens.length,
      accepted,
      delivered: 0,
      failed,
    };
    notification.failedTokens = failedTokens;
    await notification.save();

    this.logger.log(
      `Notification ${notificationId} accepted by Expo: ${accepted}/${allTokens.length}`,
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
    adminNotificationId?: string,
    recipientDataByToken = new Map<string, Record<string, unknown>>(),
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
    const messages: ExpoPushMessage[] = validTokens.map((token) => {
      const messageData = { ...data, ...recipientDataByToken.get(token) };
      const notificationType = String(messageData.type || '');
      const channelId = [
        'announcement',
        'custom',
        'training',
        'event_reminder',
        'payment_reminder',
      ].includes(notificationType)
        ? 'admin'
        : 'default';

      return {
        to: token,
        sound: 'default',
        priority: 'high',
        channelId,
        title,
        body,
        data: messageData,
      };
    });

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = this.expo.chunkPushNotifications(messages);
    const ticketIds: string[] = [];

    for (const chunk of chunks) {
      const chunkResults = await this.sendChunkWithRetry(chunk, 3);
      results.push(...chunkResults);
      // Collect ticket IDs for receipt checking
      for (const result of chunkResults) {
        if (result.success && result.ticketId) {
          ticketIds.push(result.ticketId);
        }
      }
    }

    // Check receipts after a delay to catch delivery failures
    if (ticketIds.length > 0) {
      this.checkReceiptsAsync(
        results.filter((result) => result.ticketId) as Required<
          Pick<DeliveryResult, 'token' | 'ticketId'>
        >[],
        adminNotificationId,
      );
    }

    return results;
  }

  /**
   * Check push notification receipts asynchronously (fire-and-forget)
   * This catches devices that rejected the notification after Expo accepted it
   */
  private async checkReceiptsAsync(
    deliveries: Required<Pick<DeliveryResult, 'token' | 'ticketId'>>[],
    adminNotificationId?: string,
  ): Promise<void> {
    try {
      // Wait 5 seconds for Expo to process receipts
      await this.sleep(5000);

      const tokenByTicket = new Map(
        deliveries.map((delivery) => [delivery.ticketId, delivery.token]),
      );
      const receiptChunks = this.expo.chunkPushNotificationReceiptIds(
        deliveries.map((delivery) => delivery.ticketId),
      );

      for (const chunk of receiptChunks) {
        try {
          const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);

          let delivered = 0;
          let failed = 0;
          const failedTokens: string[] = [];
          for (const receiptId of Object.keys(receipts)) {
            const receipt = receipts[receiptId];
            if (receipt.status === 'ok') delivered++;
            if (receipt.status === 'error') {
              failed++;
              const failedToken = tokenByTicket.get(receiptId);
              if (failedToken) failedTokens.push(failedToken);
              this.logger.warn(`Push receipt error for ticket ${receiptId}: ${receipt.message}`);

              // If device is no longer registered, deactivate the token
              if (receipt.details?.error === 'DeviceNotRegistered') {
                const token = tokenByTicket.get(receiptId);
                if (token) await this.pushTokenService.deactivateToken(token);
              }
            }
            await this.pushDeliveryModel.updateOne(
              { ticketId: receiptId },
              {
                status: receipt.status === 'ok' ? 'delivered' : 'failed',
                ...(receipt.status === 'error'
                  ? { error: receipt.message }
                  : { $unset: { error: 1 } }),
              },
            );
          }
          if (adminNotificationId && (delivered || failed)) {
            await this.adminNotificationModel.updateOne(
              { _id: adminNotificationId },
              {
                $inc: {
                  'deliveryStats.delivered': delivered,
                  'deliveryStats.failed': failed,
                },
                ...(failedTokens.length
                  ? { $addToSet: { failedTokens: { $each: failedTokens } } }
                  : {}),
              },
            );
          }
        } catch (error) {
          this.logger.error(`Error checking receipts: ${error.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Receipt check failed: ${error.message}`);
    }
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
      'MessageRateExceeded',
    ];
    return retryableErrors.some((e) => error.includes(e));
  }

  /**
   * Check if error indicates device/token issue
   */
  private isDeviceError(error: string): boolean {
    const deviceErrors = ['DeviceNotRegistered', 'InvalidCredentials', 'MessageTooBig'];
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

  async getDeliveryHealth(): Promise<ISuccessResponse> {
    const [pending, processing, deadLetter, failedPushLast24Hours] = await Promise.all([
      this.notificationOutboxModel.countDocuments({ status: 'pending' }),
      this.notificationOutboxModel.countDocuments({ status: 'processing' }),
      this.notificationOutboxModel.countDocuments({ status: 'dead_letter' }),
      this.pushDeliveryModel.countDocuments({
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
    ]);
    return {
      success: true,
      message: 'Notification delivery health fetched successfully',
      data: { pending, processing, deadLetter, failedPushLast24Hours },
    };
  }

  /**
   * Process scheduled notifications (called by cron job every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledNotifications(): Promise<void> {
    const now = new Date();

    const scheduledNotifications = await this.adminNotificationModel.find({
      sent: false,
      processing: { $ne: true },
      scheduledAt: { $lte: now },
    });

    this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

    for (const notification of scheduledNotifications) {
      try {
        await this.sendNotification(notification._id.toString());
      } catch (error) {
        await this.adminNotificationModel.updateOne(
          { _id: notification._id },
          { $set: { processing: false }, $inc: { retryCount: 1 } },
        );
        this.logger.error(
          `Failed to send scheduled notification ${notification._id}: ${error.message}`,
        );
      }
    }
  }

  private preferenceForType(type: AdminNotification['type']): string {
    if (type === 'event_reminder') return 'events';
    if (type === 'payment_reminder') return 'payments';
    return 'announcements';
  }

  private sanitizeData(data?: Record<string, unknown>): Record<string, unknown> {
    if (!data) return {};
    return Object.fromEntries(
      Object.entries(data).filter(
        ([key, value]) =>
          this.allowedDataKeys.has(key) && ['string', 'number', 'boolean'].includes(typeof value),
      ),
    );
  }
}
