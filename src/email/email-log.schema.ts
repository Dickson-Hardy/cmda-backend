import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum EmailStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum EmailType {
  SUBSCRIPTION_REMINDER = 'SUBSCRIPTION_REMINDER',
  BULK_MESSAGE = 'BULK_MESSAGE',
  CUSTOM = 'CUSTOM',
}

@Schema({ timestamps: true, versionKey: false })
export class EmailLog extends Document {
  @Prop({ required: true })
  recipient: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true, type: String })
  body: string;

  @Prop({ enum: EmailType, required: true })
  type: EmailType;

  @Prop({ enum: EmailStatus, default: EmailStatus.QUEUED })
  status: EmailStatus;

  @Prop()
  sentAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop()
  messageId?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
