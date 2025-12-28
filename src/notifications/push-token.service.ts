import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PushToken } from './push-token.schema';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';

@Injectable()
export class PushTokenService {
  private readonly logger = new Logger(PushTokenService.name);

  constructor(
    @InjectModel(PushToken.name) private readonly pushTokenModel: Model<PushToken>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  /**
   * Register or update a push token for a user device
   */
  async registerToken(
    userId: string,
    dto: RegisterPushTokenDto,
  ): Promise<ISuccessResponse> {
    const { token, platform, deviceId } = dto;

    try {
      // Check if token already exists for another user/device and deactivate it
      await this.pushTokenModel.updateMany(
        { token, $or: [{ userId: { $ne: userId } }, { deviceId: { $ne: deviceId } }] },
        { active: false },
      );

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
  async updateToken(
    userId: string,
    deviceId: string,
    newToken: string,
  ): Promise<ISuccessResponse> {
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
  async getTokensForUser(userId: string): Promise<string[]> {
    const tokens = await this.pushTokenModel.find({ userId, active: true });
    return tokens.map((t) => t.token);
  }

  /**
   * Get all active push tokens for targeted users based on target type
   */
  async getTokensForTarget(
    targetType: 'all' | 'role' | 'region' | 'user',
    targetValue?: string,
  ): Promise<{ userId: string; tokens: string[] }[]> {
    let userIds: string[] = [];

    switch (targetType) {
      case 'all':
        // Get all users
        const allUsers = await this.userModel.find({ isActive: true }).select('_id');
        userIds = allUsers.map((u) => u._id.toString());
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
        const roleUsers = await this.userModel
          .find({ role, isActive: true })
          .select('_id');
        userIds = roleUsers.map((u) => u._id.toString());
        break;

      case 'region':
        // Get users by region
        if (!targetValue) {
          throw new Error('Target value (region) is required');
        }
        const regionUsers = await this.userModel
          .find({ region: targetValue, isActive: true })
          .select('_id');
        userIds = regionUsers.map((u) => u._id.toString());
        break;

      case 'user':
        // Single user
        if (!targetValue) {
          throw new Error('Target value (userId) is required');
        }
        userIds = [targetValue];
        break;

      default:
        throw new Error(`Invalid target type: ${targetType}`);
    }

    // Get tokens for all targeted users
    const tokens = await this.pushTokenModel.find({
      userId: { $in: userIds },
      active: true,
    });

    // Group tokens by user
    const tokensByUser = new Map<string, string[]>();
    for (const token of tokens) {
      const existing = tokensByUser.get(token.userId) || [];
      existing.push(token.token);
      tokensByUser.set(token.userId, existing);
    }

    return Array.from(tokensByUser.entries()).map(([userId, tokens]) => ({
      userId,
      tokens,
    }));
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
