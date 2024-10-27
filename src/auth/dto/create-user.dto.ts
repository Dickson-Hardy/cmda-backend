import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEmpty,
  IsStrongPassword,
  IsNumber,
} from 'class-validator';
import { UserGender, UserRole } from '../../users/user.constant';

export class CreateUserDto {
  @ApiProperty({ example: 'string', description: 'First name of the user' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'string - optional',
    description: 'Middle name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'string', description: 'Last name of the user' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'string', description: 'Email address of the user' })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: 'string', description: 'Password for the user', minLength: 8 })
  @IsNotEmpty()
  @MinLength(8)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minNumbers: 1, minSymbols: 1, minUppercase: 1 },
    { message: 'Password must contain at least one uppercase, lowercase, number & special chars' },
  )
  password: string;

  @ApiProperty({
    example: 'string - optional with phone code',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'string - Male or Female',
    description: 'Gender of the user',
    enum: UserGender,
  })
  @IsNotEmpty()
  @IsEnum(UserGender, { message: 'correct values for gender are Male or Female' })
  readonly gender: UserGender;

  @ApiProperty({
    example: 'string - Student | Doctor | GlobalNetwork',
    description: 'Role of the user',
    enum: UserRole,
  })
  @IsNotEmpty()
  @IsEnum(UserRole, { message: 'correct values for role are Student, Doctor or GlobalNetwork' })
  readonly role: UserRole;

  @IsEmpty({ message: 'membershipId cannot be manually set or updated' })
  readonly membershipId: string;

  @IsEmpty({ message: 'emailVerified cannot be manually set or updated' })
  readonly emailVerified: boolean;

  @IsEmpty({ message: 'fullName cannot be manually set or updated' })
  readonly fullName: string;

  @ApiProperty({
    example: 'string - student chapter or state of country',
    description: 'Student chapter or country state for the doctor or global',
  })
  @IsNotEmpty()
  @IsString()
  readonly region: string;

  @ApiProperty({
    example: 'number - required for student',
    description: 'Admission year for the student. Required if role is Student',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  readonly admissionYear?: number; // student

  @ApiProperty({
    example: 'string - required for student',
    description: 'current year of study for the student. Required if role is Student',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly yearOfStudy?: string; // student

  @ApiProperty({
    example: 'string - required for doctor or globalnetwork',
    description:
      'License number for the doctor or global network. Required if role is Doctor or GlobalNetwork',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly licenseNumber?: string; // doctor || globalnetwork

  @ApiProperty({
    example: 'string - required for doctor or globalnetwork',
    description:
      'Specialty for the doctor or global network. Required if role is Doctor or GlobalNetwork',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly specialty?: string; // doctor || globalnetwork

  @ApiProperty({
    example: 'string - required for doctor or globalnetwork',
    description:
      'years of experience for the doctor or global network. Required if role is Doctor or GlobalNetwork',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly yearsOfExperience?: string; // doctor || globalnetwork
}
