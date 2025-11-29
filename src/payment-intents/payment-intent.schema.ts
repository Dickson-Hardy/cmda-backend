import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';

export enum PaymentIntentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  ABANDONED = 'ABANDONED',
}

export enum PaymentIntentProvider {
  PAYSTACK = 'PAYSTACK',
  PAYPAL = 'PAYPAL',
}

export enum PaymentIntentContext {
  DONATION = 'DONATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
  ORDER = 'ORDER',
  EVENT = 'EVENT',
}

@Schema({ timestamps: true, versionKey: false })
export class PaymentIntent extends Document {
  @Prop({ required: true, unique: true })
  intentCode: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user?: User;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'NGN' })
  currency: string;

  @Prop({ enum: PaymentIntentProvider, required: true })
  provider: PaymentIntentProvider;

  @Prop({ enum: PaymentIntentStatus, default: PaymentIntentStatus.PENDING })
  status: PaymentIntentStatus;

  @Prop({ enum: PaymentIntentContext, required: true })
  context: PaymentIntentContext;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  contextData?: Record<string, any>;

  @Prop({ type: mongoose.Schema.Types.ObjectId })
  contextEntity?: mongoose.Types.ObjectId;

  @Prop()
  checkoutUrl?: string;

  @Prop()
  providerReference?: string;

  @Prop()
  channel?: string;

  @Prop({ type: mongoose.Schema.Types.Mixed })
  providerResponse?: any;

  @Prop({ type: Date })
  lastSyncedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export const PaymentIntentSchema = SchemaFactory.createForClass(PaymentIntent);
PaymentIntentSchema.index({ email: 1, status: 1, provider: 1 });
