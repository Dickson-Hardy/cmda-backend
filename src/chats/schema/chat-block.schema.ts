import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ChatBlock extends Document {
  @Prop({ required: true, index: true })
  blocker: string;

  @Prop({ required: true, index: true })
  blocked: string;
}

export const ChatBlockSchema = SchemaFactory.createForClass(ChatBlock);
ChatBlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
