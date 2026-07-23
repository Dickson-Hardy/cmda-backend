import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ChatLog extends Document {
  @Prop({ index: true })
  user: string;

  @Prop({ index: true })
  chatWith: string;

  @Prop()
  lastMessage: string;
}

export const ChatLogSchema = SchemaFactory.createForClass(ChatLog);

// Compound index for finding chat log between two users
ChatLogSchema.index({ user: 1, chatWith: 1 }, { unique: true });
