import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNotEmpty, IsNumber, IsArray, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
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
  @Type(() => Number)
  @IsNumber()
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
  @Type(() => Number)
  @IsNumber()
  stock: number;

  @ApiPropertyOptional({ example: 'Example Brand', description: 'The brand of the product' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    description: 'Different sizes of the product, comma separated',
  })
  @IsOptional()
  @IsString()
  sizes?: string;

  @ApiPropertyOptional({
    description: 'color, name, etc of the additionalImages of the product - JSON stringified',
  })
  @IsOptional()
  @IsString()
  additionalImages?: string; // JSON stringify array of object

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Array of additional image files for the product',
  })
  @IsOptional()
  @IsArray()
  additionalImageFiles?: any[];
}
