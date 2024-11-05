import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: '5.00' })
  @IsNotEmpty()
  @IsNumberString()
  amount: string | number;
}

export class CaptureOrderDto {
  @ApiProperty({ example: 'ABC123DEF' })
  @IsNotEmpty()
  @IsString()
  orderId: string;
}
