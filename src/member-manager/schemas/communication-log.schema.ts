import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CommunicationLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  managerId: Types.ObjectId;

  @Prop({ enum: ['email', 'phone', 'sms', 'whatsapp', 'in-person', 'other'], required: true })
  type: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  content: string;

  @Prop({ enum: ['outgoing', 'incoming'], default: 'outgoing' })
  direction: string;

  @Prop({ enum: ['sent', 'delivered', 'failed', 'pending'], default: 'sent' })
  status: string;
}

export const CommunicationLogSchema = SchemaFactory.createForClass(CommunicationLog);
