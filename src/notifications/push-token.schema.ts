import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class PushToken extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ required: true, enum: ['ios', 'android'] })
  platform: string;

  @Prop({ required: true })
  deviceId: string;

  @Prop({ default: true })
  active: boolean;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);

// Create compound index for efficient queries
PushTokenSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
PushTokenSchema.index({ token: 1 }, { unique: true });
