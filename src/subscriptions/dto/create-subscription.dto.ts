import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  reference: string;
}
