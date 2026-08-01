import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Message extends Document {
  @Prop({ required: true, index: true })
  sender: string;

  @Prop({ required: true, index: true })
  receiver: string;

  @Prop({ required: true, maxlength: 2000 })
  content: string;

  @Prop()
  clientMessageId?: string;

  @Prop({ default: false, index: true })
  read: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Compound indexes for common query patterns
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, read: 1 });
MessageSchema.index(
  { sender: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } },
);
