import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RecordManualSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Amount received for a UK/Europe bank transfer',
    example: 20,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ description: 'Bank transfer reference supplied by the member' })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  reference?: string;
}
