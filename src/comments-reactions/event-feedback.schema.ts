import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventFeedbackDocument = HydratedDocument<EventFeedback>;

@Schema({ timestamps: true })
export class EventFeedback {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  event: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '' })
  comment: string;
}

export const EventFeedbackSchema = SchemaFactory.createForClass(EventFeedback);
EventFeedbackSchema.index({ event: 1, user: 1 }, { unique: true });
