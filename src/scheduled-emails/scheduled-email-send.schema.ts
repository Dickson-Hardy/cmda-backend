import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * One row per scheduled email that has been claimed for delivery.
 *
 * The unique `dedupeKey` is what makes cron sends idempotent across
 * processes: when both the web and worker dynos run the same cron (for
 * example when RABBITMQ_URL is not configured), only the process that
 * successfully inserts the claim is allowed to send. The loser gets a
 * duplicate-key error and skips the recipient.
 */
@Schema({ timestamps: true, versionKey: false })
export class ScheduledEmailSend extends Document {
  @Prop({ required: true, unique: true })
  dedupeKey: string;

  @Prop({ required: true })
  campaign: string;

  @Prop({ required: true })
  recipient: string;

  @Prop({ enum: ['sending', 'sent'], default: 'sending' })
  status: string;

  @Prop({ default: Date.now })
  attemptedAt: Date;

  @Prop()
  sentAt: Date;

  @Prop()
  lastError: string;
}

export const ScheduledEmailSendSchema = SchemaFactory.createForClass(ScheduledEmailSend);

ScheduledEmailSendSchema.index({ campaign: 1, recipient: 1 });

// Housekeeping only: dedupe keys already include the relevant period
// (year for birthdays, follow-up stage, event, expiry date), so old rows
// can be dropped without ever allowing a duplicate send.
ScheduledEmailSendSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 400 * 24 * 60 * 60 },
);
