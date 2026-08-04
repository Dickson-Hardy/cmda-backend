import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { VolunteerJob } from './volunteer-job.schema';

@Schema({ timestamps: true, versionKey: false })
export class VolunteerShift extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerJob', required: true })
  job: VolunteerJob;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ default: '' })
  location: string;

  @Prop({ required: true, min: 1 })
  maxVolunteers: number;

  @Prop({
    type: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: ['signed_up', 'completed', 'no_show'], default: 'signed_up' },
      },
    ],
    default: [],
  })
  volunteers: Array<{ user: User; status: string }>;

  @Prop({ default: '' })
  notes: string;
}

export const VolunteerShiftSchema = SchemaFactory.createForClass(VolunteerShift);
VolunteerShiftSchema.index({ job: 1, startTime: 1 });
VolunteerShiftSchema.index({ 'volunteers.user': 1 });
