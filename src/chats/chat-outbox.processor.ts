import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatOutbox } from './schema/chat-outbox.schema';
import { Message } from './schema/message.schema';
import { User } from '../users/schema/users.schema';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationType } from '../notifications/notification.constant';

@Injectable()
export class ChatOutboxProcessor {
  private processing = false;

  constructor(
    @InjectModel(ChatOutbox.name) private readonly outboxModel: Model<ChatOutbox>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Interval(5_000)
  async processPendingMessages() {
    if (this.processing) return;
    this.processing = true;

    try {
      for (let index = 0; index < 25; index += 1) {
        const now = new Date();
        const staleLock = new Date(now.getTime() - 2 * 60_000);
        const event = await this.outboxModel.findOneAndUpdate(
          {
            $or: [
              { status: 'pending', nextAttemptAt: { $lte: now } },
              { status: 'processing', lockedAt: { $lte: staleLock } },
            ],
          },
          { $set: { status: 'processing', lockedAt: now } },
          { new: true, sort: { createdAt: 1 } },
        );
        if (!event) break;

        try {
          const message = await this.messageModel.findById(event.message).lean();
          if (!message) throw new Error('Message no longer exists');
          const sender =
            message.sender === 'admin'
              ? null
              : await this.userModel.findById(message.sender).select('fullName').lean();
          const senderName = message.sender === 'admin' ? 'Admin' : sender?.fullName || 'Someone';

          await this.notificationsGateway.broadcastNewMessageNotification({
            userId: event.receiver,
            type: NotificationType.MESSAGE,
            typeId: message._id.toString(),
            content: `You have a new message from ${senderName} with body: "${message.content}"`,
          });
          await event.updateOne({
            $set: { status: 'processed', processedAt: new Date() },
            $unset: { lockedAt: 1, lastError: 1 },
          });
        } catch (error) {
          const attempts = event.attempts + 1;
          await event.updateOne({
            $set: {
              status: attempts >= 5 ? 'failed' : 'pending',
              attempts,
              nextAttemptAt: new Date(Date.now() + Math.min(60_000, 2 ** attempts * 1_000)),
              lastError: String(error?.message || error).slice(0, 500),
            },
            $unset: { lockedAt: 1 },
          });
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
