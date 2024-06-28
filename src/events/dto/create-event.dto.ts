import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDate,
  IsEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { EventAudience, EventCategory } from '../events.constant';

export class CreateEventDto {
  @ApiProperty({
    description: 'Name of the event',
    example: 'Annual Conference',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'An event that gathers industry leaders...',
    description: 'Description of the event',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Featured image URL of the event as a file',
  })
  @IsNotEmpty()
  featuredImage: any;

  @ApiProperty({
    example: 'New York, NY',
    description: 'Location of the event',
  })
  @IsNotEmpty()
  @IsString()
  location: string;

  @ApiProperty({ example: '2020-01-01', description: 'Date of the event' })
  @IsNotEmpty()
  @IsDate()
  date: Date;

  @ApiProperty({
    example: ['Lagos', 'LASUTH Chapter'],
    description: 'Regions/Chapter where the event is relevant',
    type: [String],
  })
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  region: string[];

  @ApiProperty({
    example: 'Webinar or Seminar',
    description: 'Category of the event',
    enum: EventCategory,
  })
  @IsNotEmpty()
  @IsEnum(EventCategory, { message: 'category must be either Webinar or Seminar' })
  category: EventCategory;

  @ApiProperty({
    example: [EventAudience.ALL, EventAudience.STUDENT],
    description: 'Audience of the event',
    enum: EventAudience,
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(EventAudience, {
    message: 'audience must be an array of All, Student, Doctor or GlobalNetwork',
    each: true,
  })
  audience: EventAudience[];

  @ApiPropertyOptional({
    example: 0,
    description: 'Price of the event',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  price: number;

  @IsEmpty({ message: 'slug cannot be manually set or updated' })
  readonly slug: string;
}
