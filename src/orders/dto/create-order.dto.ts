import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'abc123' })
  @IsNotEmpty()
  @IsString()
  reference: string;

  @ApiProperty({ example: 'PAYPAL | PAYSTACK' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @IsIn(['PAYPAL', 'PAYSTACK'])
  source: string;
}
