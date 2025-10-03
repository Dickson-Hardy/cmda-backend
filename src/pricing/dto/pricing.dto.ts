import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { PricingType, UserRole, PaymentFrequency, Currency } from '../pricing.entity';

export class CreatePricingDto {
  @IsEnum(PricingType)
  type: PricingType;

  @IsEnum(UserRole)
  userRole: UserRole;

  @IsEnum(PaymentFrequency)
  frequency: PaymentFrequency;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsOptional()
  @IsString()
  incomeBracket?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePricingDto {
  @IsOptional()
  @IsEnum(PricingType)
  type?: PricingType;

  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;

  @IsOptional()
  @IsEnum(PaymentFrequency)
  frequency?: PaymentFrequency;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @IsOptional()
  @IsString()
  incomeBracket?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PricingQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  type?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  userRole?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  frequency?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  currency?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  incomeBracket?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => (value === '' ? undefined : value))
  isActive?: boolean;
}
