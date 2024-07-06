import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/users.schema';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  sender: User;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  receiver: User;

  @Prop()
  content: string;
}

export const MessageShema = SchemaFactory.createForClass(Message);
