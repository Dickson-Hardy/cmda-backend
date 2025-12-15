import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  assignedTo: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  priority: string;

  @Prop({
    type: String,
    enum: ['subscription', 'payment', 'support', 'follow-up', 'documentation', 'other'],
    default: 'other',
  })
  category: string;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop()
  completedAt: Date;

  @Prop()
  completionNotes: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  estimatedHours: number;

  @Prop({ default: 0 })
  actualHours: number;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
