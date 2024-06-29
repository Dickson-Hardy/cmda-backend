import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsNumberString } from 'class-validator';
import { ProductCategory } from '../products.constant';

export class CreateProductDto {
  @ApiProperty({ example: 'Example Product', description: 'The name of the product' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'This is an example product.',
    description: 'The description of the product',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 99.99, description: 'The price of the product' })
  @IsNotEmpty()
  @IsNumberString()
  price: number;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Featured image of the product as a file',
  })
  featuredImage: any;

  @ApiProperty({
    example: Object.values(ProductCategory).join(' | '),
    description: 'The category of the product',
    enum: ProductCategory,
  })
  @IsNotEmpty()
  @IsEnum(ProductCategory)
  category: ProductCategory;

  @ApiProperty({ example: 100, description: 'The stock quantity of the product' })
  @IsNotEmpty()
  @IsNumberString()
  stock: number;

  @ApiProperty({ example: 'Example Brand', description: 'The brand of the product' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  // Uncomment if you want to handle multiple images
  // @ApiProperty({ type: [String], description: 'Array of image URLs for the product' })
  // @IsString({ each: true })
  // images?: string[];
}
