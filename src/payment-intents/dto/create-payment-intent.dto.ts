import { IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { PaymentIntentContext, PaymentIntentProvider } from '../payment-intent.schema';

export class CreatePaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(PaymentIntentProvider)
  provider: PaymentIntentProvider;

  @IsEnum(PaymentIntentContext)
  context: PaymentIntentContext;

  @IsObject()
  @IsOptional()
  contextData?: Record<string, any>;

  @IsString()
  @IsOptional()
  channel?: string;
}
