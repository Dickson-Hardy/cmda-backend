import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { DonationFrequency } from '../donation.constant';
import { Type } from 'class-transformer';

export class AreaOfNeedDto {
  @ApiProperty({ example: 'General Donation' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;
}

export class InitDonationDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  totalAmount: number;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  @IsBoolean()
  recurring: boolean;

  @ApiPropertyOptional({ enum: DonationFrequency, example: DonationFrequency.MONTHLY })
  @IsEnum(DonationFrequency)
  @IsOptional()
  frequency?: DonationFrequency;

  @ApiProperty({ description: 'Areas of need array', type: [AreaOfNeedDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AreaOfNeedDto)
  @IsNotEmpty()
  areasOfNeed: AreaOfNeedDto[];

  @ApiProperty({ description: 'user selected currency' })
  @IsNotEmpty()
  @IsString()
  @IsIn(['AUD', 'CAD', 'EUR', 'GBP', 'USD', 'NGN'])
  currency: string;
}
