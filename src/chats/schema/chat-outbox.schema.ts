import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ChatOutbox extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, unique: true })
  message: Types.ObjectId;

  @Prop({ required: true, index: true })
  receiver: string;

  @Prop({ default: 'pending', enum: ['pending', 'processing', 'processed', 'failed'], index: true })
  status: string;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: () => new Date(), index: true })
  nextAttemptAt: Date;

  @Prop()
  lockedAt?: Date;

  @Prop()
  processedAt?: Date;

  @Prop()
  lastError?: string;
}

export const ChatOutboxSchema = SchemaFactory.createForClass(ChatOutbox);
ChatOutboxSchema.index({ status: 1, nextAttemptAt: 1 });
