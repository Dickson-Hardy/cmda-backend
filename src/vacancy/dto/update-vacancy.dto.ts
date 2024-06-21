import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsEmail,
  IsDate,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateVacancyDto {
  @ApiProperty({ example: 'Updated Software Developer Position' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'Updated responsibilities...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: ['Code development', 'Testing'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  responsibilities?: string[];

  @ApiProperty({
    example: ["Bachelor's degree in Computer Science", 'Experience with React and Node.js'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  requirements?: string[];

  @ApiProperty({ example: 'XYZ Corporation' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 'New City, Country' })
  @IsOptional()
  @IsString()
  companyLocation?: string;

  @ApiProperty({ example: 'new@example.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ example: 'Updated application instructions...' })
  @IsOptional()
  @IsString()
  applicationInstructions?: string;

  @ApiProperty({ example: '2025-06-30' })
  @IsOptional()
  @IsDate()
  closingDate?: Date;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
