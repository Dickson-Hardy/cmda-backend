import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiProperty({ example: 'PAYPAL | PAYSTACK' })
  @IsNotEmpty()
  @IsString()
  source: string;
}
