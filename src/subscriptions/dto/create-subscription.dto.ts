import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiPropertyOptional({ example: 'paypal' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  targetYear?: number;
}
