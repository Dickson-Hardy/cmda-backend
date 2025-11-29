import { IsEmail, IsMongoId, IsOptional, IsString } from 'class-validator';

export class RequeryPaymentIntentDto {
  @IsOptional()
  @IsMongoId()
  intentId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
