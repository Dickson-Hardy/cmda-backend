import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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
  @IsNotEmpty()
  amount: number;
}

export class InitDonationDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
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
  @ValidateNested({ each: true })
  @Type(() => AreaOfNeedDto)
  @IsNotEmpty()
  areasOfNeed: AreaOfNeedDto[];

  @ApiProperty({ description: 'user selected currency' })
  @IsNotEmpty()
  @IsString()
  currency: string;
}
