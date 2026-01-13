import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsEmail,
  IsArray,
  Min,
} from 'class-validator';
import { ServiceCategory, ServiceStatus, Currency } from '../service-subscriptions.schema';

export class CreateServiceSubscriptionDto {
  @IsString()
  serviceName: string;

  @IsString()
  description: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @IsString()
  provider: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency;

  @IsDateString()
  purchaseDate: string;

  @IsDateString()
  renewalDate: string;

  @IsString()
  @IsOptional()
  billingCycle?: string;

  @IsBoolean()
  @IsOptional()
  autoRenewal?: boolean;

  @IsEmail()
  @IsOptional()
  accountEmail?: string;

  @IsString()
  @IsOptional()
  accountUsername?: string;

  @IsString()
  @IsOptional()
  loginUrl?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  sendReminder?: boolean;

  @IsNumber()
  @IsOptional()
  reminderDays?: number;
}

export class RenewServiceDto {
  @IsDateString()
  renewalDate: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
