import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class SupportTicket extends Document {
  @Prop({ required: true, unique: true }) reference: string;
  @Prop({ required: true, unique: true, select: false }) submissionId: string;
  @Prop({ required: true, select: false }) tokenHash: string;
  @Prop({ required: true, enum: ['complaint', 'feedback'] }) kind: string;
  @Prop({ required: true }) category: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) email: string;
  @Prop({ required: true }) subject: string;
  @Prop({ required: true }) source: string;
  @Prop({ default: 'open', enum: ['open', 'in_progress', 'awaiting_member', 'resolved'] })
  status: string;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin', default: null })
  assignedTo: Types.ObjectId;
  @Prop({ default: 0 }) revision: number;
  @Prop({ select: false }) attachmentId?: string;
  @Prop({
    type: [{ _id: false, messageId: String, author: String, message: String, createdAt: Date }],
    default: [],
  })
  messages: Array<{ messageId: string; author: string; message: string; createdAt: Date }>;
  @Prop({
    type: [{ _id: false, adminId: String, action: String, createdAt: Date }],
    default: [],
    select: false,
  })
  history: Array<{ adminId: string; action: string; createdAt: Date }>;
}
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ source: 1, kind: 1, createdAt: -1 });
