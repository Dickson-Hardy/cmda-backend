import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class WebPushSubscription extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  p256dh: string;

  @Prop({ required: true })
  auth: string;

  @Prop({ default: null })
  expirationTime: number;

  @Prop({ default: true })
  active: boolean;
}

export const WebPushSubscriptionSchema = SchemaFactory.createForClass(WebPushSubscription);

// A browser subscription endpoint belongs to a single user/device. Re-registering
// the same endpoint (e.g. after another login) replaces the old owner.
WebPushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });
WebPushSubscriptionSchema.index({ userId: 1, active: 1 });
