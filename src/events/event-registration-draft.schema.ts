import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class EventRegistrationDraft extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true })
  eventId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  accommodation?: Record<string, unknown>;

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  customResponses: Record<string, unknown>;

  @Prop({ required: true, expires: 0 })
  expiresAt: Date;
}

export const EventRegistrationDraftSchema = SchemaFactory.createForClass(EventRegistrationDraft);
EventRegistrationDraftSchema.index({ eventId: 1, userId: 1 }, { unique: true });
