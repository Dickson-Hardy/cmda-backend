import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

class TicketComment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ enum: ['open', 'in-progress', 'resolved', 'closed'], default: 'open' })
  status: string;

  @Prop({ enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Prop({ enum: ['subscription', 'technical', 'billing', 'general', 'other'], required: true })
  category: string;

  @Prop({ type: [TicketComment], default: [] })
  comments: TicketComment[];

  @Prop()
  resolvedAt: Date;

  @Prop()
  resolutionNotes: string;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
