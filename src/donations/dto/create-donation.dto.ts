import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDonationDto {
  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({ example: 'paypal' })
  @IsString()
  @IsOptional()
  source?: string;
}
