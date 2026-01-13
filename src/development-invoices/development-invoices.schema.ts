import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  PAYSTACK = 'paystack',
  CHECK = 'check',
  CASH = 'cash',
  OTHER = 'other',
}

export enum Currency {
  NGN = 'NGN',
  USD = 'USD',
}

@Schema({ timestamps: true })
export class DevelopmentInvoice extends Document {
  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop({ type: [String] }) // Array of deliverable IDs
  deliverableIds: string[];

  @Prop({ type: Number, required: true })
  totalAmount: number;

  @Prop({ type: String, enum: Currency, default: Currency.NGN })
  currency: Currency;

  @Prop({ type: Number, default: 0 })
  amountPaid: number;

  @Prop({ type: Date, required: true })
  issueDate: Date;

  @Prop({ type: Date, required: true })
  dueDate: Date;

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod: PaymentMethod;

  @Prop({ type: Date })
  paidDate: Date;

  @Prop({ type: String })
  paymentReference: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: String })
  clientName: string;

  @Prop({ type: String })
  clientEmail: string;

  @Prop({ type: String })
  paymentTerms: string; // e.g., "Net 30 days"

  @Prop({ type: [Object] }) // Payment history
  paymentHistory: {
    amount: number;
    date: Date;
    method: PaymentMethod;
    reference: string;
    notes: string;
  }[];

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const DevelopmentInvoiceSchema = SchemaFactory.createForClass(DevelopmentInvoice);
