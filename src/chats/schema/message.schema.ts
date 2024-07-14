import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Message extends Document {
  @Prop()
  sender: string;

  @Prop()
  receiver: string;

  @Prop()
  content: string;
}

export const MessageShema = SchemaFactory.createForClass(Message);
