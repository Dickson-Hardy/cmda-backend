import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/users.schema';

@Schema({ timestamps: true, versionKey: false })
export class Vacancy extends Document {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  responsibilities: string[];

  @Prop()
  requirements: string[];

  @Prop()
  companyName: string;

  @Prop()
  companyLocation: string;

  @Prop()
  contactEmail: string;

  @Prop()
  applicationInstructions: string;

  @Prop()
  closingDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  applicants: User;
}

export const VacancySchema = SchemaFactory.createForClass(Vacancy);
