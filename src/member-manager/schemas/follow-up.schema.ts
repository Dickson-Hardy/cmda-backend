import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class FollowUp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedTo: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ enum: ['pending', 'completed', 'cancelled'], default: 'pending' })
  status: string;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop()
  completedAt: Date;

  @Prop()
  completionNotes: string;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
