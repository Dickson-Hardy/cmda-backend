import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ServiceCategory {
  DOMAIN = 'domain',
  HOSTING = 'hosting',
  SSL_CERTIFICATE = 'ssl_certificate',
  SOFTWARE_LICENSE = 'software_license',
  CLOUD_SERVICE = 'cloud_service',
  API_SERVICE = 'api_service',
  EMAIL_SERVICE = 'email_service',
  PAYMENT_GATEWAY = 'payment_gateway',
  OTHER = 'other',
}

export enum ServiceStatus {
  ACTIVE = 'active',
  EXPIRING_SOON = 'expiring_soon', // Within 7 days
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}

@Schema({ timestamps: true })
export class ServiceSubscription extends Document {
  @Prop({ required: true })
  serviceName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: ServiceCategory, required: true })
  category: ServiceCategory;

  @Prop({ type: String, enum: ServiceStatus, default: ServiceStatus.ACTIVE })
  status: ServiceStatus;

  @Prop({ required: true })
  provider: string; // e.g., GoDaddy, Namecheap, AWS, etc.

  @Prop({ type: Number, required: true })
  cost: number;

  @Prop({ type: String, enum: Currency, default: Currency.USD })
  currency: Currency;

  @Prop({ type: Date, required: true })
  purchaseDate: Date;

  @Prop({ type: Date, required: true })
  renewalDate: Date;

  @Prop({ type: Date })
  lastRenewalDate: Date;

  @Prop({ type: String }) // e.g., "monthly", "yearly", "one-time"
  billingCycle: string;

  @Prop({ type: Boolean, default: true })
  autoRenewal: boolean;

  @Prop({ type: String })
  accountEmail: string;

  @Prop({ type: String })
  accountUsername: string;

  @Prop({ type: String })
  loginUrl: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: Boolean, default: true }) // Send renewal reminder
  sendReminder: boolean;

  @Prop({ type: Number, default: 7 }) // Days before renewal to send reminder
  reminderDays: number;

  @Prop({ type: Date })
  lastReminderSent: Date;

  @Prop({ type: [Object] }) // Renewal history
  renewalHistory: {
    date: Date;
    cost: number;
    notes: string;
  }[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ServiceSubscriptionSchema = SchemaFactory.createForClass(ServiceSubscription);
