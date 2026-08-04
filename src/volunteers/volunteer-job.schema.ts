import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';

@Schema({ timestamps: true, versionKey: false })
export class VolunteerJob extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '' })
  responsibilities: string;

  @Prop({ default: '' })
  requirements: string;

  @Prop({ default: '' })
  applicationInstructions: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ enum: ['missions', 'local_organizing', 'advocacy', 'other'], default: 'other' })
  category: string;

  @Prop({ default: '' })
  company: string;

  @Prop({ default: '' })
  companyLogo: string;

  @Prop()
  closingDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        appliedAt: Date,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      },
    ],
    default: [],
  })
  applicants: Array<{ user: User; appliedAt: Date; status: string }>;
}

export const VolunteerJobSchema = SchemaFactory.createForClass(VolunteerJob);
VolunteerJobSchema.index({ isActive: 1, closingDate: 1 });
