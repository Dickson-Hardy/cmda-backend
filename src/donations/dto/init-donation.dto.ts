import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { DonationFrequency } from '../donation.constant';

export class InitDonationDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: false })
  @IsNotEmpty()
  @IsBoolean()
  recurring: boolean;

  @ApiPropertyOptional({ enum: DonationFrequency, example: DonationFrequency.MONTHLY })
  @IsEnum(DonationFrequency)
  @IsOptional()
  frequency?: DonationFrequency;
}
