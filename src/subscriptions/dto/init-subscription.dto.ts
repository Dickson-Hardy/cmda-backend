import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, IsIn, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class InitSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Calendar year covered by an annual subscription',
    example: 2026,
  })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  @IsOptional()
  targetYear?: number;

  @ApiPropertyOptional({ description: 'Whether to activate Nigerian lifetime membership' })
  @IsBoolean()
  @IsOptional()
  isNigerianLifetime?: boolean;

  @ApiPropertyOptional({
    enum: ['regular', 'lifetime', 'donations'],
    description: 'Selected subscription tab',
  })
  @IsString()
  @IsOptional()
  @IsIn(['regular', 'lifetime', 'donations'])
  selectedTab?: string;

  @ApiPropertyOptional({
    enum: ['gold', 'platinum', 'diamond'],
    description: 'Lifetime membership type',
  })
  @IsString()
  @IsOptional()
  @IsIn(['gold', 'platinum', 'diamond'])
  lifetimeType?: string;

  @ApiPropertyOptional({ description: 'Income bracket for Global Network members' })
  @IsString()
  @IsOptional()
  incomeBracket?: string;

  @ApiPropertyOptional({ description: 'Donation amount for Vision Partner subscriptions' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  donationAmount?: number;
}
