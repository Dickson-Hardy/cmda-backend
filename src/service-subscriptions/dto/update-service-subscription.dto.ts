import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsOptional,
  Min,
  Max,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { ServiceCategory } from '../service-subscriptions.schema';

export class UpdateServiceSubscriptionDto {
  @IsOptional()
  @IsString()
  serviceName?: string;

  @IsOptional()
  @IsEnum(ServiceCategory)
  category?: ServiceCategory;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsUrl()
  serviceUrl?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: Date;

  @IsOptional()
  @IsDateString()
  renewalDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  billingCycle?: string;

  @IsOptional()
  @IsBoolean()
  autoRenewal?: boolean;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsEmail()
  accountEmail?: string;

  @IsOptional()
  @IsString()
  accountUsername?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(90)
  reminderDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
