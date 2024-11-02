import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsNumber,
  ValidateNested,
  IsEmail,
  IsPhoneNumber,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import * as mongoose from 'mongoose';

class ProductQuantityDto {
  @ApiProperty({ example: '60d0fe4f5311236168a109ca', description: 'The ID of the product' })
  @IsNotEmpty()
  @IsString()
  product: mongoose.Schema.Types.ObjectId;

  @ApiProperty({ example: 2, description: 'The quantity of the product' })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Red', description: 'The color of the product' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'M', description: 'The size of the product' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class InitOrderDto {
  @ApiProperty({
    type: [ProductQuantityDto],
    description: 'Array of products with their quantities',
  })
  @IsNotEmpty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductQuantityDto)
  products: ProductQuantityDto[];

  @ApiProperty({ example: 100, description: 'The total amount of the order' })
  @IsNotEmpty()
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ example: 'John Doe', description: 'The name of the shipping contact' })
  @IsNotEmpty()
  @IsString()
  shippingContactName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email of the shipping contact',
  })
  @IsNotEmpty()
  @IsEmail()
  shippingContactEmail: string;

  @ApiProperty({ example: '+1234567890', description: 'The phone number of the shipping contact' })
  @IsNotEmpty()
  @IsPhoneNumber('NG')
  shippingContactPhone: string;

  @ApiProperty({ example: '123 Main St, Springfield, IL', description: 'The shipping address' })
  @IsNotEmpty()
  @IsString()
  shippingAddress: string;
}
