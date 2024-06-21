import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsPhoneNumber, IsBoolean, IsNumber } from 'class-validator';
import { UserGender, UserRole } from '../../users/user.constant';

export class UpdateUserDto {
  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: "URL of the user's avatar image",
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({
    example: 'cloudinary-image-id',
    description: "Cloudinary ID for the user's avatar image",
  })
  @IsOptional()
  @IsString()
  avatarCloudId?: string;

  @ApiProperty({ example: 'John', description: "User's first name" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'A.', description: "User's middle name" })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Doe', description: "User's last name" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'John A. Doe', description: "User's full name" })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({ example: '+1234567890', description: "User's phone number" })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty({ example: UserGender.MALE, description: "User's gender", enum: UserGender })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiProperty({ example: UserRole.DOCTOR, description: "User's role", enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: true, description: "Whether the user's email is verified" })
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiProperty({ example: 'North Region', description: "User's region" })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiProperty({ example: 2021, description: 'Year of admission for a student' })
  @IsOptional()
  @IsNumber()
  admissionYear?: number;

  @ApiProperty({ example: '3rd Year', description: 'Year of study for a student' })
  @IsOptional()
  @IsString()
  yearOfStudy?: string;

  @ApiProperty({
    example: 'LIC123456',
    description: 'License number for a doctor or global network member',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({
    example: 'Cardiology',
    description: 'Specialty for a doctor or global network member',
  })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiProperty({
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
