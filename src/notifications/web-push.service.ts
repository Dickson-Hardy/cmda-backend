import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { PushTokenService } from './push-token.service';
import { WebPushSubscription } from './web-push-subscription.schema';
import { RegisterWebPushDto } from './dto/register-web-push.dto';
import { ISuccessResponse } from '../_global/interface/success-response';

export interface WebPushRecipient {
  userId: string;
  data?: Record<string, unknown>;
}

interface StoredSubscription {
  _id: unknown;
  endpoint: string;
  p256dh: string;
  auth: string;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configured = false;

  constructor(
    @InjectModel(WebPushSubscription.name)
    private readonly subscriptionModel: Model<WebPushSubscription>,
    private readonly pushTokenService: PushTokenService,
  ) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@cmdanigeria.org';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.configured = true;
      } catch (error) {
        this.logger.error(`Invalid VAPID configuration: ${error.message}`);
      }
    } else {
      this.logger.warn('Web Push is disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set');
    }
  }

  /** Public key is safe to expose — the browser needs it to create a subscription. */
  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async subscribe(userId: string, dto: RegisterWebPushDto): Promise<ISuccessResponse> {
    if (!this.configured) {
      throw new BadRequestException('Web push is not configured on the server');
    }

    const endpoint = dto.endpoint.trim();
    await this.subscriptionModel.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          expirationTime: dto.expirationTime ?? null,
          active: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    this.logger.log(`Web push subscription registered for user ${userId}`);
    return {
      success: true,
      message: 'Push subscription registered successfully',
      data: { endpoint },
    };
  }

  async unsubscribe(userId: string, endpoint: string): Promise<ISuccessResponse> {
    await this.subscriptionModel.deleteOne({ userId, endpoint: endpoint.trim() });
    return { success: true, message: 'Push subscription removed successfully' };
  }

  /** Remove stale subscriptions for a user (used when disabling push everywhere). */
  async unsubscribeAll(userId: string): Promise<ISuccessResponse> {
    const result = await this.subscriptionModel.deleteMany({ userId });
    return {
      success: true,
      message: `Removed ${result.deletedCount} push subscription(s)`,
    };
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data: Record<string, unknown> = {},
    preference?: string,
  ): Promise<number> {
    if (!this.configured || !(await this.isAllowed(userId, preference))) return 0;

    const subscriptions = await this.subscriptionModel.find({ userId, active: true }).lean().exec();
    const results = await Promise.all(
      subscriptions.map((subscription) => this.deliver(subscription, title, body, data)),
    );
    return results.reduce((total, sent) => total + sent, 0);
  }

  async sendToMany(
    recipients: WebPushRecipient[],
    title: string,
    body: string,
    commonData: Record<string, unknown> = {},
    preference?: string,
  ): Promise<number> {
    const results = await Promise.all(
      recipients.map((recipient) =>
        this.sendToUser(
          recipient.userId,
          title,
          body,
          { ...commonData, ...(recipient.data || {}) },
          preference,
        ),
      ),
    );
    return results.reduce((total, sent) => total + sent, 0);
  }

  private async isAllowed(userId: string, preference?: string): Promise<boolean> {
    if (!(await this.pushTokenService.isPreferenceEnabled(userId, 'pushNotifications'))) {
      return false;
    }
    if (preference && !(await this.pushTokenService.isPreferenceEnabled(userId, preference))) {
      return false;
    }
    return true;
  }

  private async deliver(
    subscription: StoredSubscription,
    title: string,
    body: string,
    data: Record<string, unknown>,
  ): Promise<number> {
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'cmda-notification',
      url: this.targetUrl(data),
      data,
    });

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
        { TTL: 60, urgency: 'normal' },
      );
      return 1;
    } catch (error) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await this.subscriptionModel.deleteOne({ _id: subscription._id });
        this.logger.warn('Removed an expired web push subscription');
      } else {
        this.logger.warn(`Web push delivery failed: ${error?.message || error}`);
      }
      return 0;
    }
  }

  private targetUrl(data: Record<string, unknown>): string {
    if (typeof data.notificationId === 'string' && data.notificationId) {
      return `/dashboard/notifications/${data.notificationId}`;
    }
    const slug = data.slug || data.eventSlug;
    if (typeof slug === 'string' && slug && ['event', 'event_reminder'].includes(String(data.type))) {
      return `/dashboard/events/${slug}`;
    }
    if (typeof data.orderId === 'string' && data.orderId) {
      return `/dashboard/store/orders/${data.orderId}`;
    }
    if (['payment', 'payment_reminder', 'subscription', 'donation'].includes(String(data.type))) {
      return '/dashboard/payments';
    }
    if (data.type === 'volunteer') return '/dashboard/jobs/my-applications';
    if (['message', 'reply'].includes(String(data.type))) return '/dashboard/messaging';
    return '/dashboard/notifications';
  }
}
