import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventReminderDocument = HydratedDocument<EventReminder>;

@Schema({ timestamps: true })
export class EventReminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Event', required: true })
  event: Types.ObjectId;

  @Prop({ required: true })
  reminderDate: Date;

  @Prop({ enum: ['push', 'email', 'both'], default: 'push' })
  method: string;

  @Prop({ default: false })
  sent: boolean;
}

export const EventReminderSchema = SchemaFactory.createForClass(EventReminder);
EventReminderSchema.index({ user: 1, event: 1 }, { unique: true });
EventReminderSchema.index({ reminderDate: 1, sent: 1 });
