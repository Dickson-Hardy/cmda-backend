import { IsNotEmpty, IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole, UserGender } from '../../users/user.constant';

export class CreateMemberManualDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsEnum(UserGender)
  gender: UserGender;

  @IsOptional()
  dateOfBirth?: string;

  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @IsNotEmpty()
  @IsString()
  region: string;

  @IsOptional()
  @IsString()
  leadershipPosition?: string;

  // Student fields
  @IsOptional()
  admissionYear?: number;

  @IsOptional()
  @IsString()
  yearOfStudy?: string;

  // Doctor/GlobalNetwork fields
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  yearsOfExperience?: string;

  // Verification fields
  @IsOptional()
  @IsString()
  referee?: string;

  @IsOptional()
  @IsEmail()
  refereeEmail?: string;

  @IsOptional()
  @IsString()
  refereePhone?: string;
}
