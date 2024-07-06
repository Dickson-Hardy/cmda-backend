import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDonationDto {
  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
