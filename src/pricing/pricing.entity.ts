import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PricingType {
  SUBSCRIPTION = 'subscription',
  LIFETIME = 'lifetime',
  INCOME_BASED = 'income_based',
}

export enum UserRole {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  DOCTOR_SENIOR = 'DoctorSenior',
  GLOBAL_NETWORK = 'GlobalNetwork',
  LIFE_MEMBER = 'LifeMember',
}

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}

export enum PaymentFrequency {
  MONTHLY = 'monthly',
  ANNUAL = 'annual',
  LIFETIME = 'lifetime',
}

@Schema({ timestamps: true, versionKey: false })
export class Pricing extends Document {
  @Prop({
    type: String,
    enum: Object.values(PricingType),
    default: PricingType.SUBSCRIPTION,
  })
  type: PricingType;

  @Prop({
    type: String,
    enum: Object.values(UserRole),
    required: true,
  })
  userRole: UserRole;

  @Prop({
    type: String,
    enum: Object.values(PaymentFrequency),
    default: PaymentFrequency.ANNUAL,
  })
  frequency: PaymentFrequency;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  amount: number;

  @Prop({
    type: String,
    enum: Object.values(Currency),
    default: Currency.NGN,
  })
  currency: Currency;

  @Prop({ type: String })
  incomeBracket?: string; // For income-based pricing

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
