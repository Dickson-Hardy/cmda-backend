import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsArray,
  IsString,
  IsEmail,
  IsDate,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Software Developer' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'About the job and the company..' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: ['Code development', 'Bug fixing'] })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  responsibilities: string[];

  @ApiProperty({ example: ["Bachelor's degree in Computer Science", 'Experience with React'] })
  @IsNotEmpty()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  requirements: string[];

  @ApiProperty({ example: 'ABC Company' })
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty({ example: 'City, Country' })
  @IsNotEmpty()
  @IsString()
  companyLocation: string;

  @ApiProperty({ example: 'example@email.com' })
  @IsNotEmpty()
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ example: 'Please send your resume and cover letter...' })
  @IsOptional()
  @IsString()
  applicationInstructions: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsNotEmpty()
  @IsDate()
  closingDate: Date;
}
