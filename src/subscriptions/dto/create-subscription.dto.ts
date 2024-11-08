import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiPropertyOptional({ example: 'paypal' })
  @IsString()
  @IsOptional()
  source?: string;
}
