import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class InitSubscriptionDto {
  @ApiPropertyOptional({ description: 'Whether to activate Nigerian lifetime membership' })
  @IsBoolean()
  @IsOptional()
  isNigerianLifetime?: boolean;

  @ApiPropertyOptional({ enum: ['regular', 'lifetime', 'donations'], description: 'Selected subscription tab' })
  @IsString()
  @IsOptional()
  @IsIn(['regular', 'lifetime', 'donations'])
  selectedTab?: string;

  @ApiPropertyOptional({ enum: ['gold', 'platinum', 'diamond'], description: 'Lifetime membership type' })
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
