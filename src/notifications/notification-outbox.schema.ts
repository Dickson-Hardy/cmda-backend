import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class NotificationOutbox extends Document {
  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  @Prop({ type: Object, required: true })
  payload: Record<string, unknown>;

  @Prop({ enum: ['pending', 'processing', 'delivered', 'dead_letter'], default: 'pending' })
  status: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: Date.now })
  nextAttemptAt: Date;

  @Prop()
  claimedAt: Date;

  @Prop()
  deliveredAt: Date;

  @Prop()
  lastError: string;
}

export const NotificationOutboxSchema = SchemaFactory.createForClass(NotificationOutbox);
NotificationOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
