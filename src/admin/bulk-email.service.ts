import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { EmailLog, EmailStatus, EmailType } from '../email/email-log.schema';
import { EmailService } from '../email/email.service';
import { BulkEmailRecipientType, SendBulkEmailDto } from './dto/send-bulk-email.dto';
import { GetEmailLogsDto } from './dto/get-email-logs.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { escapeRegex } from '../_common/escape-regex.util';
import { RabbitMqService } from '../queue/rabbitmq.service';

@Injectable()
export class BulkEmailService {
  private readonly logger = new Logger(BulkEmailService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(EmailLog.name) private emailLogModel: Model<EmailLog>,
    private emailService: EmailService,
    private rabbitMq: RabbitMqService,
  ) {}

  async sendBulkEmails(dto: SendBulkEmailDto): Promise<ISuccessResponse> {
    let recipients: string[] = [];

    // Get recipients based on type
    switch (dto.recipientType) {
      case BulkEmailRecipientType.ALL_USERS:
        const allUsers = await this.userModel.find({}, 'email');
        recipients = allUsers.map((u) => u.email);
        break;

      case BulkEmailRecipientType.UNPAID_SUBSCRIPTIONS:
        const unpaidUsers = await this.userModel.find({ subscribed: false }, 'email');
        recipients = unpaidUsers.map((u) => u.email);
        break;

      case BulkEmailRecipientType.EXPIRED_SUBSCRIPTIONS:
        const now = new Date();
        const expiredUsers = await this.userModel.find(
          {
            subscribed: true,
            subscriptionExpiry: { $lt: now },
          },
          'email',
        );
        recipients = expiredUsers.map((u) => u.email);
        break;

      case BulkEmailRecipientType.CUSTOM_LIST:
        recipients = dto.customEmails || [];
        break;
    }

    // Create email logs for all recipients
    const emailLogs = await this.emailLogModel.insertMany(
      recipients.map((email) => ({
        recipient: email,
        subject: dto.subject,
        body: dto.body,
        type: EmailType.BULK_MESSAGE,
        status: EmailStatus.QUEUED,
        metadata: dto.metadata,
      })),
    );

    // Add to queue
    await this.enqueueEmailLogs(emailLogs);

    this.logger.log(`Queued ${emailLogs.length} emails for sending`);

    return {
      success: true,
      message: `${emailLogs.length} emails queued for sending`,
      data: { queuedCount: emailLogs.length, recipients: recipients.length },
    };
  }

  async sendSubscriptionReminders(): Promise<ISuccessResponse> {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Find users whose subscription expires in 7 days
    const expiringUsers = await this.userModel.find({
      subscribed: true,
      subscriptionExpiry: {
        $gte: now,
        $lte: sevenDaysFromNow,
      },
    });

    const emailLogs = await this.emailLogModel.insertMany(
      expiringUsers.map((user) => ({
        recipient: user.email,
        subject: 'CMDA Nigeria - Subscription Renewal Reminder',
        body: this.generateRenewalReminderEmail(user.fullName, user.subscriptionExpiry),
        type: EmailType.SUBSCRIPTION_REMINDER,
        status: EmailStatus.QUEUED,
        metadata: { userId: user._id.toString() },
      })),
    );

    await this.enqueueEmailLogs(emailLogs);

    this.logger.log(`Queued ${emailLogs.length} subscription reminder emails`);

    return {
      success: true,
      message: `${emailLogs.length} subscription reminders queued`,
      data: { queuedCount: emailLogs.length },
    };
  }

  async getEmailLogs(query: GetEmailLogsDto): Promise<ISuccessResponse> {
    const { page = 1, limit = 20, status, type, recipient } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (recipient) filter.recipient = { $regex: escapeRegex(recipient), $options: 'i' };

    const [logs, total] = await Promise.all([
      this.emailLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      this.emailLogModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Email logs fetched successfully',
      data: {
        items: logs,
        meta: {
          currentPage: pageNum,
          itemsPerPage: limitNum,
          totalItems: total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    };
  }

  async getQueueStatus(): Promise<ISuccessResponse> {
    const [stats, queueLength] = await Promise.all([
      this.emailLogModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      this.emailLogModel.countDocuments({
        status: { $in: [EmailStatus.QUEUED, EmailStatus.FAILED] },
      }),
    ]);

    return {
      success: true,
      message: 'Queue status fetched successfully',
      data: {
        queueLength,
        isProcessing: Boolean(await this.emailLogModel.exists({ status: EmailStatus.SENDING })),
        stats: stats.reduce(
          (acc, curr) => {
            acc[curr._id] = curr.count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      },
    };
  }

  async processEmailLog(id: string): Promise<void> {
    const log = await this.emailLogModel.findOneAndUpdate(
      { _id: id, status: { $in: [EmailStatus.QUEUED, EmailStatus.FAILED] }, attempts: { $lt: 4 } },
      { status: EmailStatus.SENDING, $inc: { attempts: 1 } },
      { new: true },
    );
    if (!log) return;
    try {
      const result = await this.emailService.sendEmail({
        to: log.recipient,
        subject: log.subject,
        html: log.body,
      });
      if (!result.success) throw new Error('Email provider rejected the message');
      await log.updateOne({
        status: EmailStatus.SENT,
        sentAt: new Date(),
        messageId: result.messageId,
        $unset: { failedAt: 1, errorMessage: 1 },
      });
    } catch (error) {
      await log.updateOne({
        status: EmailStatus.FAILED,
        failedAt: new Date(),
        errorMessage: String(error?.message || error).slice(0, 500),
      });
      throw error;
    }
  }

  async processPendingEmails(limit = 25): Promise<void> {
    const pending = await this.emailLogModel
      .find({ status: { $in: [EmailStatus.QUEUED, EmailStatus.FAILED] }, attempts: { $lt: 4 } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .select('_id');
    for (const item of pending) {
      try {
        await this.processEmailLog(item._id.toString());
      } catch (error) {
        this.logger.error(`Bulk email ${item._id} failed: ${error?.message || error}`);
      }
    }
  }

  private async enqueueEmailLogs(emailLogs: EmailLog[]): Promise<void> {
    for (let offset = 0; offset < emailLogs.length; offset += 100) {
      const batch = emailLogs.slice(offset, offset + 100);
      await Promise.all(
        batch.map((log) => this.rabbitMq.publish('bulk-email', log._id.toString())),
      );
    }
  }

  private generateRenewalReminderEmail(name: string, expiryDate: Date): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription Renewal Reminder</h2>
        <p>Dear ${name},</p>
        <p>This is a friendly reminder that your CMDA Nigeria membership subscription will expire on <strong>${expiryDate.toLocaleDateString()}</strong>.</p>
        <p>To continue enjoying uninterrupted access to our services, please renew your subscription at your earliest convenience.</p>
        <p>You can renew your subscription by logging into your account on our website.</p>
        <br>
        <p>Best regards,</p>
        <p><strong>CMDA Nigeria Team</strong></p>
      </div>
    `;
  }
}
