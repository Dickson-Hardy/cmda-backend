import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from '../../users/users.schema';

@Schema({ timestamps: true, versionKey: false })
export class ChatLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  chatWith: User;

  @Prop()
  lastMessage: string;
}

export const ChatLogSchema = SchemaFactory.createForClass(ChatLog);
