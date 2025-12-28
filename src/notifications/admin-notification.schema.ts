import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationType = 'announcement' | 'event_reminder' | 'payment_reminder' | 'custom';
export type TargetType = 'all' | 'role' | 'region' | 'user';

@Schema({ timestamps: true, versionKey: false })
export class AdminNotification extends Document {
  @Prop({ required: true, maxlength: 50 })
  title: string;

  @Prop({ required: true, maxlength: 200 })
  body: string;

  @Prop({
    required: true,
    enum: ['announcement', 'event_reminder', 'payment_reminder', 'custom'],
  })
  type: NotificationType;

  @Prop({ required: true, enum: ['all', 'role', 'region', 'user'] })
  targetType: TargetType;

  @Prop()
  targetValue: string;

  @Prop()
  scheduledAt: Date;

  @Prop({ default: false })
  sent: boolean;

  @Prop()
  sentAt: Date;

  @Prop(
    raw({
      total: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    }),
  )
  deliveryStats: {
    total: number;
    delivered: number;
    failed: number;
  };

  @Prop({ type: Object })
  data: Record<string, any>;

  @Prop()
  createdBy: string; // Admin ID who created the notification

  @Prop({ type: [String], default: [] })
  failedTokens: string[]; // Track tokens that failed delivery

  @Prop({ default: 0 })
  retryCount: number;
}

export const AdminNotificationSchema = SchemaFactory.createForClass(AdminNotification);

// Index for efficient queries
AdminNotificationSchema.index({ createdAt: -1 });
AdminNotificationSchema.index({ sent: 1, scheduledAt: 1 });
AdminNotificationSchema.index({ type: 1 });
