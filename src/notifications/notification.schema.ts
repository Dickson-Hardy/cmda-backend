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
  content: string;

  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index(
  { userId: 1, typeId: 1 },
  { unique: true, partialFilterExpression: { typeId: { $type: 'string' } } },
);
