import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';

@Schema({ timestamps: true, versionKey: false })
export class Subscription extends Document {
  @Prop()
  amount: number;

  @Prop()
  reference: string;

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
}

export const SubscriptionShema = SchemaFactory.createForClass(Subscription);
