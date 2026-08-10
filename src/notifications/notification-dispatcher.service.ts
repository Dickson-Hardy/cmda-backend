import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationType } from './notification.constant';
import { NotificationsService } from './notifications.service';
import { PushTokenService } from './push-token.service';
import { NotificationOutbox } from './notification-outbox.schema';

export interface MemberNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  idempotencyKey: string;
  preference: string;
  data?: Record<string, unknown>;
  pushBody?: string;
}

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushTokenService: PushTokenService,
    @InjectModel(NotificationOutbox.name)
    private readonly outboxModel: Model<NotificationOutbox>,
  ) {}

  async notify(input: MemberNotification): Promise<void> {
    const outbox = await this.outboxModel.findOneAndUpdate(
      { idempotencyKey: input.idempotencyKey },
      {
        $setOnInsert: {
          idempotencyKey: input.idempotencyKey,
          payload: input,
          status: 'pending',
          attempts: 0,
          nextAttemptAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
    if (outbox.status === 'delivered' || outbox.status === 'dead_letter') return;
    await this.deliver(outbox._id.toString());
  }

  private async deliver(outboxId: string): Promise<void> {
    const staleClaim = new Date(Date.now() - 10 * 60 * 1000);
    const outbox = await this.outboxModel.findOneAndUpdate(
      {
        _id: outboxId,
        status: { $in: ['pending', 'processing'] },
        nextAttemptAt: { $lte: new Date() },
        $or: [{ status: 'pending' }, { claimedAt: { $lt: staleClaim } }],
      },
      { status: 'processing', claimedAt: new Date() },
      { new: true },
    );
    if (!outbox) return;
    const input = outbox.payload as unknown as MemberNotification;

    try {
      if (await this.pushTokenService.isPreferenceEnabled(input.userId, input.preference)) {
        await this.notificationsService.create({
          userId: input.userId,
          type: input.type,
          title: input.title,
          content: input.body,
          typeId: input.idempotencyKey,
          data: { type: input.type, ...input.data },
        } as any);

        await this.pushTokenService.sendToUser(
          input.userId,
          input.title,
          input.pushBody || input.body,
          { type: input.type, ...input.data },
          input.preference,
        );
      }
      await this.outboxModel.updateOne(
        { _id: outbox._id },
        { status: 'delivered', deliveredAt: new Date(), $unset: { lastError: 1, claimedAt: 1 } },
      );
    } catch (error) {
      const attempts = outbox.attempts + 1;
      const deadLetter = attempts >= 5;
      const delayMinutes = Math.min(60, 2 ** attempts);
      await this.outboxModel.updateOne(
        { _id: outbox._id },
        {
          status: deadLetter ? 'dead_letter' : 'pending',
          attempts,
          nextAttemptAt: new Date(Date.now() + delayMinutes * 60 * 1000),
          lastError: error instanceof Error ? error.message : String(error),
          $unset: { claimedAt: 1 },
        },
      );
      this.logger.error(
        `Notification ${input.idempotencyKey} failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  async notifyMany(inputs: MemberNotification[]): Promise<void> {
    await Promise.all(inputs.map((input) => this.notify(input)));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processPending(): Promise<void> {
    const pending = await this.outboxModel
      .find({ status: 'pending', nextAttemptAt: { $lte: new Date() } })
      .sort({ nextAttemptAt: 1 })
      .limit(100)
      .select('_id');
    await Promise.all(pending.map((item) => this.deliver(item._id.toString())));
  }
}
