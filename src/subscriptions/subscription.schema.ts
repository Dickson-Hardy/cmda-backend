import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';

@Schema({ timestamps: true, versionKey: false })
export class Subscription extends Document {
  @Prop()
  amount: number;

  @Prop()
  reference: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ default: 'Annually ' })
  frequency?: string;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop()
  source: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop()
  expiryDate: Date;

  // New fields for income-based pricing
  @Prop()
  incomeBracket?: string; // for global members: greater_than_200k, 100k_to_200k, etc.

  @Prop({ default: false })
  isLifetime?: boolean;

  @Prop()
  lifetimeType?: string; // gold, platinum, diamond

  @Prop({ default: false })
  isVisionPartner?: boolean; // for donations/vision partners
}

export const SubscriptionShema = SchemaFactory.createForClass(Subscription);
