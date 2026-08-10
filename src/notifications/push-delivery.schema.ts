import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class PushDelivery extends Document {
  @Prop({ required: true, index: true })
  notificationId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ index: true })
  ticketId: string;

  @Prop({ enum: ['accepted', 'delivered', 'failed'], required: true })
  status: string;

  @Prop()
  error: string;

  @Prop({ default: 1 })
  attempts: number;
}

export const PushDeliverySchema = SchemaFactory.createForClass(PushDelivery);
PushDeliverySchema.index({ notificationId: 1, token: 1 }, { unique: true });
PushDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
