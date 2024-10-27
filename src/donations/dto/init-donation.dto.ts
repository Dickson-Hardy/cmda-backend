import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { DonationFrequency } from '../donation.constant';

export class InitDonationDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  @IsBooleanString()
  recurring: boolean;

  @ApiPropertyOptional({ enum: DonationFrequency, example: DonationFrequency.MONTHLY })
  @IsEnum(DonationFrequency)
  @IsOptional()
  frequency?: DonationFrequency;

  @ApiPropertyOptional({ example: 'Donating for the good work' })
  @IsOptional()
  @IsString()
  areasOfNeed: string;
}
