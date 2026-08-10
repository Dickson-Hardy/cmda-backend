import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from './notification.constant';

@Schema({ timestamps: true, versionKey: false })
export class Notification extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop()
  type: NotificationType;

  @Prop()
  typeId: string;

  @Prop()
  title: string;

  @Prop()
  content: string;

  @Prop({ type: Object, default: {} })
  data: Record<string, unknown>;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  deletedAt: Date;

  @Prop({ default: () => new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) })
  expiresAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index(
  { userId: 1, typeId: 1 },
  { unique: true, partialFilterExpression: { typeId: { $type: 'string' } } },
);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
