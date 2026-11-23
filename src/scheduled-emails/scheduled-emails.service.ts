import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { Event } from '../events/events.schema';
import { EmailService } from '../email/email.service';
import { RabbitMqService } from '../queue/rabbitmq.service';
import { ScheduledEmailSend } from './scheduled-email-send.schema';
import { BIRTHDAY_EMAIL_TEMPLATE } from '../email/templates/birthday.template';
import { SUBSCRIPTION_RENEWAL_REMINDER_TEMPLATE } from '../email/templates/subscription-renewal-reminder.template';
import {
  EVENT_REMINDER_TEMPLATE,
  VIRTUAL_MEETING_INFO_SNIPPET,
} from '../email/templates/event-reminder.template';
import {
  WELCOME_FOLLOWUP_TEMPLATE,
  ENGAGEMENT_FOLLOWUP_TEMPLATE,
} from '../email/templates/followup.template';

@Injectable()
export class ScheduledEmailsService implements OnModuleInit {
  private readonly logger = new Logger(ScheduledEmailsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(ScheduledEmailSend.name)
    private scheduledSendModel: Model<ScheduledEmailSend>,
    private emailService: EmailService,
    private rabbitMq: RabbitMqService,
  ) {}

  async onModuleInit() {
    // Make sure the unique dedupe index exists before any cron/manual run
    // can claim a send.
    await this.scheduledSendModel.init();
  }

  /**
   * Only the worker should run crons when a job queue is configured.
   * Without a queue both processes must run them, which is why every
   * send below also goes through an atomic per-recipient claim.
   */
  private shouldRunCron(force: boolean): boolean {
    if (force) return true;
    if (process.env.PROCESS_ROLE === 'worker') return true;
    return !this.rabbitMq.isConfigured();
  }

  /**
   * Atomically claim one scheduled email. Returns the dedupe key when this
   * process won the claim, or null when another process already handled it.
   */
  private async claimSend(
    campaign: string,
    recipient: string,
    context: string,
  ): Promise<string | null> {
    const normalizedRecipient = recipient.trim().toLowerCase();
    const dedupeKey = `${campaign}:${normalizedRecipient}:${context}`;

    try {
      await this.scheduledSendModel.create({
        dedupeKey,
        campaign,
        recipient: normalizedRecipient,
        status: 'sending',
        attemptedAt: new Date(),
      });
      return dedupeKey;
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        this.logger.debug(
          `Skipping duplicate ${campaign} email to ${normalizedRecipient} (${context})`,
        );
        return null;
      }
      throw error;
    }
  }

  private async markSent(dedupeKey: string): Promise<void> {
    await this.scheduledSendModel
      .updateOne({ dedupeKey }, { $set: { status: 'sent', sentAt: new Date() } })
      .exec();
  }

  private async releaseClaim(dedupeKey: string, error?: unknown): Promise<void> {
    // Remove the claim so a later run can retry this recipient.
    await this.scheduledSendModel.deleteOne({ dedupeKey }).exec();
    if (error) {
      this.logger.warn(
        `Released scheduled-email claim ${dedupeKey}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Claim then send exactly once. EmailService returns `{ success: false }`
   * instead of throwing on SMTP errors, so both outcomes are handled.
   */
  private async sendOnce(
    campaign: string,
    recipient: string,
    context: string,
    send: () => Promise<{ success: boolean }>,
  ): Promise<'sent' | 'skipped' | 'failed'> {
    const dedupeKey = await this.claimSend(campaign, recipient, context);
    if (!dedupeKey) return 'skipped';

    let result: { success: boolean };
    try {
      result = await send();
    } catch (error) {
      // The send itself failed before delivery; allow a later retry.
      await this.releaseClaim(dedupeKey, error);
      throw error;
    }

    if (!result?.success) {
      await this.releaseClaim(dedupeKey, new Error('Email provider reported failure'));
      return 'failed';
    }

    try {
      await this.markSent(dedupeKey);
    } catch (error) {
      // The email was already delivered. Keep the claim so a retry cannot
      // send it twice; only the bookkeeping status is stale.
      this.logger.warn(
        `Email delivered but failed to mark claim ${dedupeKey} as sent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return 'sent';
  }

  /**
   * Send birthday emails daily at 6:00 AM
   * Checks for users whose birthday is today
   */
  @Cron('0 6 * * *', {
    name: 'send-birthday-emails',
    timeZone: 'Africa/Lagos',
  })
  async sendBirthdayEmails(force = false) {
    if (!this.shouldRunCron(force)) return;
    this.logger.log('Running birthday email cron job...');

    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
      const currentDay = today.getDate();
      const currentYear = today.getFullYear();

      // Find users with birthdays today
      const users = await this.userModel
        .find({
          dateOfBirth: { $exists: true, $ne: null },
        })
        .exec();

      const birthdayUsers = users.filter((user) => {
        if (user.dateOfBirth) {
          const birthDate = new Date(user.dateOfBirth);
          return birthDate.getMonth() + 1 === currentMonth && birthDate.getDate() === currentDay;
        }
        return false;
      });

      this.logger.log(`Found ${birthdayUsers.length} users with birthdays today`);

      for (const user of birthdayUsers) {
        try {
          const emailContent = BIRTHDAY_EMAIL_TEMPLATE.replace(
            /\[Name\]/g,
            user.firstName || 'Member',
          );

          const outcome = await this.sendOnce(
            'birthday',
            user.email,
            `${user._id}:${currentYear}`,
            () =>
              this.emailService.sendBirthdayEmail({
                to: user.email,
                subject: `🎉 Happy Birthday ${user.firstName}! - CMDA Nigeria`,
                html: emailContent,
              }),
          );

          if (outcome === 'sent') {
            this.logger.log(`Birthday email sent to ${user.email}`);
          }
        } catch (error) {
          this.logger.error(`Failed to send birthday email to ${user.email}:`, error);
        }
      }

      this.logger.log('Birthday email cron job completed');
    } catch (error) {
      this.logger.error('Error in birthday email cron job:', error);
    }
  }

  /**
   * Send subscription renewal reminders daily at 8:00 AM
   * Sends reminders at 30, 14, 7, 3, and 1 days before expiry
   */
  @Cron('0 8 * * *', {
    name: 'send-subscription-reminders',
    timeZone: 'Africa/Lagos',
  })
  async sendSubscriptionReminders(force = false) {
    if (!this.shouldRunCron(force)) return;
    this.logger.log('Running subscription reminder cron job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Days before expiry to send reminders
      const reminderDays = [30, 14, 7, 3, 1];

      for (const days of reminderDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(23, 59, 59, 999);

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Find users whose subscription expires in X days
        const users = await this.userModel
          .find({
            subscriptionExpiry: {
              $gte: startOfDay,
              $lte: targetDate,
            },
            subscribed: true,
          })
          .exec();

        this.logger.log(`Found ${users.length} users expiring in ${days} days`);

        for (const user of users) {
          try {
            const expiryDate = new Date(user.subscriptionExpiry);
            const formattedDate = expiryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            const emailContent = SUBSCRIPTION_RENEWAL_REMINDER_TEMPLATE.replace(
              /\[Name\]/g,
              user.firstName || 'Member',
            )
              .replace(/\[DaysRemaining\]/g, days.toString())
              .replace(/\[ExpiryDate\]/g, formattedDate);

            const outcome = await this.sendOnce(
              'subscription-reminder',
              user.email,
              `${user._id}:${days}:${expiryDate.toISOString().slice(0, 10)}`,
              () =>
                this.emailService.sendReminderEmail({
                  to: user.email,
                  subject: `⏰ Your CMDA Subscription Expires in ${days} Day${days !== 1 ? 's' : ''}`,
                  html: emailContent,
                }),
            );

            if (outcome === 'sent') {
              this.logger.log(`Renewal reminder sent to ${user.email} (${days} days)`);
            }
          } catch (error) {
            this.logger.error(`Failed to send reminder to ${user.email}:`, error);
          }
        }
      }

      this.logger.log('Subscription reminder cron job completed');
    } catch (error) {
      this.logger.error('Error in subscription reminder cron job:', error);
    }
  }

  /**
   * Send event reminders daily at 9:00 AM
   * Sends reminders 7 days and 1 day before events
   */
  @Cron('0 9 * * *', {
    name: 'send-event-reminders',
    timeZone: 'Africa/Lagos',
  })
  async sendEventReminders(force = false) {
    if (!this.shouldRunCron(force)) return;
    this.logger.log('Running event reminder cron job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Send reminders 7 days and 1 day before
      const reminderDays = [7, 1];

      for (const days of reminderDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        targetDate.setHours(23, 59, 59, 999);

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Find events happening in X days
        const events = await this.eventModel
          .find({
            eventDateTime: {
              $gte: startOfDay,
              $lte: targetDate,
            },
          })
          .populate('registeredUsers.userId', 'email firstName')
          .exec();

        this.logger.log(`Found ${events.length} events in ${days} days`);

        for (const event of events) {
          if (!event.registeredUsers || event.registeredUsers.length === 0) {
            continue;
          }

          for (const registeredUser of event.registeredUsers) {
            try {
              // Get the populated user data
              const user = registeredUser.userId as any;
              if (!user || !user.email) {
                continue;
              }

              const eventDate = new Date(event.eventDateTime);
              const formattedDate = eventDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
              const formattedTime = eventDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const timeUntilEvent = days === 7 ? '1 Week' : '1 Day';
              const arrivalTime = days === 7 ? '30' : '15';
              const eventType = event.isConference ? 'Conference' : 'Event';

              let emailContent = EVENT_REMINDER_TEMPLATE.replace(
                /\[Name\]/g,
                user.firstName || 'Member',
              )
                .replace(/\[EventType\]/g, eventType)
                .replace(/\[EventName\]/g, event.name)
                .replace(/\[EventDate\]/g, formattedDate)
                .replace(/\[EventTime\]/g, formattedTime)
                .replace(/\[EventLocation\]/g, event.linkOrLocation || 'To be announced')
                .replace(/\[TimeUntilEvent\]/g, timeUntilEvent)
                .replace(/\[ArrivalTime\]/g, arrivalTime)
                .replace(
                  /\[EventUrl\]/g,
                  `https://cmdanigeria.net/dashboard/${eventType.toLowerCase()}s/${event._id}`,
                )
                .replace(/\[AdditionalReminders\]/g, '');

              // Add virtual meeting info if applicable
              if (
                (event.eventType === 'Virtual' || event.eventType === 'Hybrid') &&
                event.virtualMeetingInfo
              ) {
                let virtualInfo = VIRTUAL_MEETING_INFO_SNIPPET.replace(
                  /\[Platform\]/g,
                  event.virtualMeetingInfo.platform || 'Not specified',
                ).replace(/\[MeetingLink\]/g, event.virtualMeetingInfo.meetingLink || '#');

                if (event.virtualMeetingInfo.meetingId) {
                  virtualInfo = virtualInfo.replace(
                    /\[MeetingIdInfo\]/g,
                    `<p style="margin: 8px 0; font-size: 15px;"><strong>Meeting ID:</strong> ${event.virtualMeetingInfo.meetingId}</p>`,
                  );
                } else {
                  virtualInfo = virtualInfo.replace(/\[MeetingIdInfo\]/g, '');
                }

                if (event.virtualMeetingInfo.passcode) {
                  virtualInfo = virtualInfo.replace(
                    /\[PasscodeInfo\]/g,
                    `<p style="margin: 8px 0; font-size: 15px;"><strong>Passcode:</strong> ${event.virtualMeetingInfo.passcode}</p>`,
                  );
                } else {
                  virtualInfo = virtualInfo.replace(/\[PasscodeInfo\]/g, '');
                }

                emailContent = emailContent.replace(/\[VirtualMeetingInfo\]/g, virtualInfo);
              } else {
                emailContent = emailContent.replace(/\[VirtualMeetingInfo\]/g, '');
              }

              const outcome = await this.sendOnce(
                'event-reminder',
                user.email,
                `${user._id}:${event._id}:${days}`,
                () =>
                  this.emailService.sendReminderEmail({
                    to: user.email,
                    subject: `📅 Reminder: ${event.name} is in ${timeUntilEvent}!`,
                    html: emailContent,
                  }),
              );

              if (outcome === 'sent') {
                this.logger.log(
                  `Event reminder sent to ${user.email} for ${event.name} (${days} days)`,
                );
              }
            } catch (error) {
              const user = registeredUser.userId as any;
              this.logger.error(
                `Failed to send event reminder to ${user?.email || 'unknown'}:`,
                error,
              );
            }
          }
        }
      }

      this.logger.log('Event reminder cron job completed');
    } catch (error) {
      this.logger.error('Error in event reminder cron job:', error);
    }
  }

  /**
   * Send follow-up emails to new members daily at 10:00 AM
   * Sends follow-ups at 3, 7, and 30 days after registration
   */
  @Cron('0 10 * * *', {
    name: 'send-followup-emails',
    timeZone: 'Africa/Lagos',
  })
  async sendFollowUpEmails(force = false) {
    if (!this.shouldRunCron(force)) return;
    this.logger.log('Running follow-up email cron job...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Send follow-ups at 3, 7, and 30 days after registration
      const followUpDays = [
        { days: 3, template: WELCOME_FOLLOWUP_TEMPLATE },
        { days: 7, template: WELCOME_FOLLOWUP_TEMPLATE },
        ...(process.env.DISABLE_DAY30_FOLLOWUP === 'true'
          ? []
          : [{ days: 30, template: ENGAGEMENT_FOLLOWUP_TEMPLATE }]),
      ];

      for (const { days, template } of followUpDays) {
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() - days);
        targetDate.setHours(23, 59, 59, 999);

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Find users who registered exactly X days ago
        const users = await this.userModel
          .find({
            createdAt: {
              $gte: startOfDay,
              $lte: targetDate,
            },
          })
          .exec();

        this.logger.log(`Found ${users.length} users registered ${days} days ago`);

        for (const user of users) {
          try {
            const emailContent = template
              .replace(/\[Name\]/g, user.firstName || 'Member')
              .replace(/\[DaysSinceRegistration\]/g, days.toString());

            const subjects = {
              3: '👋 Getting Started with CMDA Nigeria App',
              7: '🚀 Making the Most of Your CMDA Membership',
              30: '💜 We Miss You at CMDA Nigeria',
            };

            const outcome = await this.sendOnce(
              'followup',
              user.email,
              `${user._id}:${days}`,
              () =>
                this.emailService.sendReminderEmail({
                  to: user.email,
                  subject: subjects[days],
                  html: emailContent,
                }),
            );

            if (outcome === 'sent') {
              this.logger.log(`Follow-up email sent to ${user.email} (${days} days)`);
            }
          } catch (error) {
            this.logger.error(`Failed to send follow-up to ${user.email}:`, error);
          }
        }
      }

      this.logger.log('Follow-up email cron job completed');
    } catch (error) {
      this.logger.error('Error in follow-up email cron job:', error);
    }
  }

  /**
   * Manual trigger methods for testing
   */
  async triggerBirthdayEmails() {
    this.logger.log('Manually triggering birthday emails...');
    return this.sendBirthdayEmails(true);
  }

  async triggerSubscriptionReminders() {
    this.logger.log('Manually triggering subscription reminders...');
    return this.sendSubscriptionReminders(true);
  }

  async triggerEventReminders() {
    this.logger.log('Manually triggering event reminders...');
    return this.sendEventReminders(true);
  }

  async triggerFollowUpEmails() {
    this.logger.log('Manually triggering follow-up emails...');
    return this.sendFollowUpEmails(true);
  }
}
