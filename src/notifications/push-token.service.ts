import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { PushToken } from './push-token.schema';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';
import { Expo } from 'expo-server-sdk';

@Injectable()
export class PushTokenService {
  private readonly logger = new Logger(PushTokenService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectModel(PushToken.name) private readonly pushTokenModel: Model<PushToken>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Register or update a push token for a user device
   */
  async registerToken(userId: string, dto: RegisterPushTokenDto): Promise<ISuccessResponse> {
    const { token, platform, deviceId } = dto;

    // Validate Expo push token format
    if (!Expo.isExpoPushToken(token)) {
      throw new BadRequestException(
        `Invalid Expo push token format: ${String(token).substring(0, 20)}...`,
      );
    }

    try {
      // Deactivate ALL existing entries for this token (prevents unique index conflict)
      await this.pushTokenModel.updateMany({ token }, { active: false });

      // Upsert the token for this user/device combination
      const pushToken = await this.pushTokenModel.findOneAndUpdate(
        { userId, deviceId },
        { token, platform, active: true },
        { upsert: true, new: true },
      );

      this.logger.log(`Push token registered for user ${userId} on device ${deviceId}`);

      return {
        success: true,
        message: 'Push token registered successfully',
        data: { id: pushToken._id },
      };
    } catch (error) {
      this.logger.error(`Failed to register push token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing push token (when token changes, e.g., app reinstall)
   */
  async updateToken(userId: string, deviceId: string, newToken: string): Promise<ISuccessResponse> {
    try {
      const result = await this.pushTokenModel.findOneAndUpdate(
        { userId, deviceId },
        { token: newToken, active: true },
        { new: true },
      );

      if (!result) {
        return {
          success: false,
          message: 'Push token not found for this device',
        };
      }

      this.logger.log(`Push token updated for user ${userId} on device ${deviceId}`);

      return {
        success: true,
        message: 'Push token updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to update push token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove push token on logout
   */
  async removeToken(userId: string, deviceId: string): Promise<ISuccessResponse> {
    try {
      await this.pushTokenModel.deleteOne({ userId, deviceId });

      this.logger.log(`Push token removed for user ${userId} on device ${deviceId}`);

      return {
        success: true,
        message: 'Push token removed successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to remove push token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove all push tokens for a user (logout from all devices)
   */
  async removeAllTokensForUser(userId: string): Promise<ISuccessResponse> {
    try {
      const result = await this.pushTokenModel.deleteMany({ userId });

      this.logger.log(`Removed ${result.deletedCount} push tokens for user ${userId}`);

      return {
        success: true,
        message: `Removed ${result.deletedCount} push tokens`,
      };
    } catch (error) {
      this.logger.error(`Failed to remove all push tokens: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all active push tokens for a specific user
   */
  async getTokensForUser(userId: string, preference?: string): Promise<string[]> {
    if (preference) {
      const user = await this.userModel.findById(userId).select('notificationPreferences');
      const preferences = (user as any)?.notificationPreferences || {};
      if (preferences.pushNotifications === false || preferences[preference] === false) {
        return [];
      }
    }
    const tokens = await this.pushTokenModel.find({ userId, active: true });
    return tokens.map((t) => t.token);
  }

  async isPreferenceEnabled(userId: string, preference: string): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('notificationPreferences');
    return (user as any)?.notificationPreferences?.[preference] !== false;
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
    preference?: string,
  ): Promise<boolean> {
    const tokens = (await this.getTokensForUser(userId, preference)).filter((token) =>
      Expo.isExpoPushToken(token),
    );
    if (!tokens.length) return false;

    const messages = tokens.map((to) => ({
      to,
      sound: 'default' as const,
      priority: 'high' as const,
      channelId: 'default',
      title,
      body,
      data,
    }));
    const tickets = await this.expo.sendPushNotificationsAsync(messages);
    await Promise.all(
      tickets.map((ticket, index) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          return this.deactivateToken(tokens[index]);
        }
        return Promise.resolve();
      }),
    );
    return tickets.some((ticket) => ticket.status === 'ok');
  }

  /**
   * Get all active push tokens for targeted users based on target type
   * Only includes users who have push notifications enabled in their preferences
   */
  async getTokensForTarget(
    targetType: 'all' | 'role' | 'region' | 'user',
    targetValue?: string,
    preference?: string,
  ): Promise<{ userId: string; tokens: string[] }[]> {
    const userIds = await this.getTargetUserIds(targetType, targetValue, true, preference);
    const tokens = await this.pushTokenModel.find({ userId: { $in: userIds }, active: true });
    const tokensByUser = new Map<string, string[]>();
    for (const token of tokens) {
      const existing = tokensByUser.get(token.userId) || [];
      existing.push(token.token);
      tokensByUser.set(token.userId, existing);
    }
    return userIds.map((userId) => ({ userId, tokens: tokensByUser.get(userId) || [] }));
  }

  async getTargetUserIds(
    targetType: 'all' | 'role' | 'region' | 'user',
    targetValue?: string,
    pushOnly = false,
    preference?: string,
  ): Promise<string[]> {
    // `isActive` was added after many production users already existed.
    // Treat only an explicit false as inactive so legacy members remain
    // targetable by email, role, region, and all-user broadcasts.
    const userQuery: any = { isActive: { $ne: false } };

    switch (targetType) {
      case 'all':
        // No additional filters for all users
        break;

      case 'role':
        // Get users by role (student, doctor, globalnetwork)
        if (!targetValue) {
          throw new Error('Target value (role) is required');
        }
        const roleMap: Record<string, UserRole> = {
          student: UserRole.STUDENT,
          doctor: UserRole.DOCTOR,
          globalnetwork: UserRole.GLOBALNETWORK,
        };
        const role = roleMap[targetValue.toLowerCase()];
        if (!role) {
          throw new Error(`Invalid role: ${targetValue}`);
        }
        userQuery.role = role;
        break;

      case 'region':
        // Get users by region
        if (!targetValue) {
          throw new Error('Target value (region) is required');
        }
        userQuery.region = targetValue;
        break;

      case 'user':
        // The admin UI accepts either a MongoDB user ID or an email address.
        // Never assign an arbitrary string to `_id`, because Mongoose will
        // throw a CastError before the query can return an empty result.
        if (!targetValue) {
          throw new Error('Target value (userId) is required');
        }
        const userTarget = targetValue.trim();
        if (isValidObjectId(userTarget)) {
          userQuery._id = userTarget;
        } else {
          userQuery.email = userTarget.toLowerCase();
        }
        break;

      default:
        throw new Error(`Invalid target type: ${targetType}`);
    }

    if (pushOnly) userQuery['notificationPreferences.pushNotifications'] = { $ne: false };
    if (preference) userQuery[`notificationPreferences.${preference}`] = { $ne: false };

    const users = await this.userModel.find(userQuery).select('_id');
    return users.map((u) => u._id.toString());
  }

  /**
   * Deactivate invalid tokens (called when Expo reports invalid tokens)
   */
  async deactivateToken(token: string): Promise<void> {
    await this.pushTokenModel.updateOne({ token }, { active: false });
    this.logger.log(`Deactivated invalid push token: ${token.substring(0, 20)}...`);
  }

  /**
   * Get count of active tokens for a user
   */
  async getTokenCountForUser(userId: string): Promise<number> {
    return this.pushTokenModel.countDocuments({ userId, active: true });
  }
}
