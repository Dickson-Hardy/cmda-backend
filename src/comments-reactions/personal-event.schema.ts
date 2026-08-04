import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PersonalEventDocument = HydratedDocument<PersonalEvent>;

@Schema({ timestamps: true })
export class PersonalEvent {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true })
  eventDate: Date;

  @Prop({ default: '' })
  color: string;

  @Prop({ enum: ['birthday', 'milestone', 'reminder', 'other'], default: 'other' })
  category: string;

  @Prop({ default: false })
  allDay: boolean;
}

export const PersonalEventSchema = SchemaFactory.createForClass(PersonalEvent);
PersonalEventSchema.index({ user: 1, eventDate: 1 });
