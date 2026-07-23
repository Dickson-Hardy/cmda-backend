import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Message extends Document {
  @Prop({ index: true })
  sender: string;

  @Prop({ index: true })
  receiver: string;

  @Prop()
  content: string;

  @Prop({ default: false, index: true })
  read: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Compound indexes for common query patterns
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, read: 1 });
