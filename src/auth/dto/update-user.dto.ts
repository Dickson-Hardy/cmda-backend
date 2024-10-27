import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsNumberString, IsDateString } from 'class-validator';
import { UserGender } from '../../users/user.constant';

export class UpdateUserDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: "User's avatar as a file",
  })
  @IsOptional()
  avatar?: any;

  @ApiPropertyOptional({ example: 'John', description: "User's first name" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'A.', description: "User's middle name" })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: "User's last name" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: "User's phone number" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: UserGender.MALE, description: "User's gender", enum: UserGender })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiPropertyOptional({ example: 'North Region', description: "User's region" })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: '2000-01-01', description: 'Date of birth' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 2021, description: 'Year of admission for a student' })
  @IsOptional()
  @IsNumberString()
  admissionYear?: string | number;

  @ApiPropertyOptional({ example: '3rd Year', description: 'Year of study for a student' })
  @IsOptional()
  @IsString()
  yearOfStudy?: string;

  @ApiPropertyOptional({
    example: 'LIC123456',
    description: 'License number for a doctor or global network member',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional({
    example: 'Cardiology',
    description: 'Specialty for a doctor or global network member',
  })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({
    example: 'string - required for doctor or globalnetwork',
    description:
      'years of experience for the doctor or global network. Required if role is Doctor or GlobalNetwork',
    required: false,
  })
  @IsOptional()
  @IsString()
  yearsOfExperience?: string; // doctor || globalnetwork

  @ApiPropertyOptional({
    example: {
      facebook: 'https://facebook.com/user',
      twitter: 'https://twitter.com/user',
      instagram: 'https://instagram.com/user',
      linkedin: 'https://linkedin.com/user',
    },
    description: "User's social media links",
  })
  @IsOptional()
  socials?: Record<string, string>;
}
