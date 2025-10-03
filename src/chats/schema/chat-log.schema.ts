import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ChatLog extends Document {
  @Prop()
  user: string;

  @Prop()
  chatWith: string;

  @Prop()
  lastMessage: string;
}

export const ChatLogSchema = SchemaFactory.createForClass(ChatLog);
