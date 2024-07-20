import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { DonationFrequency } from './donation.constant';

@Schema({ timestamps: true, versionKey: false })
export class Donation extends Document {
  @Prop()
  amount: number;

  @Prop()
  reference: string;

  @Prop({ default: false })
  recurring: boolean;

  @Prop()
  frequency?: DonationFrequency;

  @Prop({ default: '' })
  comment: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;
}

export const DonationShema = SchemaFactory.createForClass(Donation);
