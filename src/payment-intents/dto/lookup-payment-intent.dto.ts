import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../_global/dto/pagination-query.dto';
import { PaymentIntentProvider, PaymentIntentStatus } from '../payment-intent.schema';

export class LookupPaymentIntentDto extends PaginationQueryDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsEnum(PaymentIntentStatus)
  status?: PaymentIntentStatus;

  @IsOptional()
  @IsEnum(PaymentIntentProvider)
  provider?: PaymentIntentProvider;

  @IsOptional()
  @IsString()
  reference?: string;
}
