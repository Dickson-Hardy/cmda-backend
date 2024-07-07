import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../order.constant';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiProperty({
    example: OrderStatus.PENDING,
    description: 'Status of the order',
    enum: OrderStatus,
  })
  @IsNotEmpty()
  @IsEnum(OrderStatus, {
    message: 'status must be one of ' + Object.values(OrderStatus).join(', '),
  })
  status: OrderStatus;

  @ApiProperty({ example: 'Good to go', description: 'Comment regarding the order update' })
  @IsNotEmpty()
  @IsString()
  comment: string;
}
