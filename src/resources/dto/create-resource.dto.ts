import { IsString, IsNotEmpty, IsOptional, IsDate, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceCategory } from '../resources.constant';

export class CreateResourceDto {
  @ApiProperty({
    description: 'Title of the resource',
    example: 'Learning NestJS',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Description of the resource',
    example: 'An in-depth guide to learning NestJS framework',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Slug of the resource',
    example: 'learning-nestjs',
  })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: 'Featured image URL of the resource',
    example: 'http://example.com/featured-image.jpg',
  })
  @IsString()
  @IsNotEmpty()
  featuredImage: string;

  @ApiPropertyOptional({
    description: 'The URL associated with the resource',
    example: 'http://example.com/media.mp4',
  })
  @IsString()
  sourceUrl: string;

  @ApiProperty({
    description: 'Type of the resource',
    example: 'video',
  })
  @IsEnum({})
  @IsString()
  @IsNotEmpty()
  category: ResourceCategory; // or enum ResourceType if you have it defined

  @ApiPropertyOptional({
    description: 'Tags associated with the resource',
    example: ['nestjs', 'guide', 'tutorial'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Author information',
    example: { name: 'John Doe', avatarUrl: 'http://example.com/avatar.jpg' },
  })
  @IsNotEmpty()
  author: {
    name: string;
    avatarUrl?: string;
  };

  @ApiProperty({
    description: 'Published date of the resource',
    example: '2024-06-20T12:00:00Z',
  })
  @IsDate()
  @IsNotEmpty()
  publishedAt: Date;
}
