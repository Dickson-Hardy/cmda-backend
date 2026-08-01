import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class MessageReport extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Message', required: true, index: true })
  message: Types.ObjectId;

  @Prop({ required: true, index: true })
  reporter: string;

  @Prop({ required: true, maxlength: 500 })
  reason: string;

  @Prop({ default: 'pending', enum: ['pending', 'reviewed', 'dismissed'] })
  status: string;
}

export const MessageReportSchema = SchemaFactory.createForClass(MessageReport);
MessageReportSchema.index({ message: 1, reporter: 1 }, { unique: true });
