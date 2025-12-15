import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { EmailLog, EmailStatus, EmailType } from '../email/email-log.schema';
import { EmailService } from '../email/email.service';
import { BulkEmailRecipientType, SendBulkEmailDto } from './dto/send-bulk-email.dto';
import { GetEmailLogsDto } from './dto/get-email-logs.dto';
import { ISuccessResponse } from '../_global/interface/success-response';

@Injectable()
export class BulkEmailService {
  private readonly logger = new Logger(BulkEmailService.name);
  private readonly emailQueue: Array<{ log: EmailLog; retry: number }> = [];
  private isProcessing = false;
  private readonly RATE_LIMIT_MS = 1000; // 1 second between emails
  private readonly MAX_RETRIES = 3;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(EmailLog.name) private emailLogModel: Model<EmailLog>,
    private emailService: EmailService,
  ) {
    // Start processing queue
    this.processQueue();
  }

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
    emailLogs.forEach((log) => {
      this.emailQueue.push({ log, retry: 0 });
    });

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

    emailLogs.forEach((log) => {
      this.emailQueue.push({ log, retry: 0 });
    });

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
    if (recipient) filter.recipient = { $regex: recipient, $options: 'i' };

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
    const stats = await this.emailLogModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      success: true,
      message: 'Queue status fetched successfully',
      data: {
        queueLength: this.emailQueue.length,
        isProcessing: this.isProcessing,
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

  private async processQueue() {
    setInterval(async () => {
      if (this.isProcessing || this.emailQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      const item = this.emailQueue.shift();

      if (!item) {
        this.isProcessing = false;
        return;
      }

      try {
        // Update status to SENDING
        await this.emailLogModel.findByIdAndUpdate(item.log._id, {
          status: EmailStatus.SENDING,
        });

        // Send email using the email service
        const result = await this.emailService.sendEmail({
          to: item.log.recipient,
          subject: item.log.subject,
          html: item.log.body,
        });

        // Update status to SENT
        await this.emailLogModel.findByIdAndUpdate(item.log._id, {
          status: EmailStatus.SENT,
          sentAt: new Date(),
          messageId: result?.messageId,
        });

        this.logger.log(`Email sent successfully to ${item.log.recipient}`);
      } catch (error) {
        this.logger.error(`Failed to send email to ${item.log.recipient}: ${error.message}`);

        // Retry logic
        if (item.retry < this.MAX_RETRIES) {
          item.retry++;
          this.emailQueue.push(item);
          this.logger.log(
            `Retrying email to ${item.log.recipient} (${item.retry}/${this.MAX_RETRIES})`,
          );
        } else {
          // Mark as failed after max retries
          await this.emailLogModel.findByIdAndUpdate(item.log._id, {
            status: EmailStatus.FAILED,
            failedAt: new Date(),
            errorMessage: error.message,
          });
        }
      } finally {
        this.isProcessing = false;
      }
    }, this.RATE_LIMIT_MS);
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
