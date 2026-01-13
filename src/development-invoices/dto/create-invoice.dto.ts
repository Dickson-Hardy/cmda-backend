import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  IsEmail,
  Min,
} from 'class-validator';
import { InvoiceStatus, PaymentMethod, Currency } from '../development-invoices.schema';

export class CreateInvoiceDto {
  @IsString()
  invoiceNumber: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  deliverableIds?: string[];

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsDateString()
  issueDate: string;

  @IsDateString()
  dueDate: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsEmail()
  @IsOptional()
  clientEmail?: string;

  @IsString()
  @IsOptional()
  paymentTerms?: string;
}

export class RecordPaymentDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  date: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
