import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MemberNote extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ enum: ['general', 'support', 'subscription', 'followup', 'other'], default: 'general' })
  category: string;

  @Prop({ default: false })
  isPinned: boolean;
}

export const MemberNoteSchema = SchemaFactory.createForClass(MemberNote);
