import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class RefreshPendingPaymentDto {
  @ApiProperty({ description: 'Payment reference number', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
  @ApiProperty({
    description: 'Type of payment',
    enum: ['events', 'subscriptions', 'donations'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['events', 'subscriptions', 'donations'])
  type?: 'events' | 'subscriptions' | 'donations';

  @ApiProperty({ description: 'Payment source/gateway', required: false })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ description: 'Whether to refresh all pending payments', required: false })
  @IsOptional()
  @IsBoolean()
  bulkRefresh?: boolean;
}
