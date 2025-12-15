import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { UserGender, UserRole, MemberCategory } from '../../users/user.constant';

export class CreateMemberByAdminDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    example: 'A.',
    description: 'Middle name of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  middleName?: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address of the user' })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiPropertyOptional({
    example: '+2348012345678',
    description: 'Phone number of the user',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Male',
    description: 'Gender of the user',
    enum: UserGender,
  })
  @IsNotEmpty()
  @IsEnum(UserGender, { message: 'correct values for gender are Male or Female' })
  readonly gender: UserGender;

  @ApiProperty({
    example: 'Student',
    description: 'Role of the user - Student, Doctor or GlobalNetwork',
    enum: UserRole,
  })
  @IsNotEmpty()
  @IsEnum(UserRole, { message: 'correct values for role are Student, Doctor or GlobalNetwork' })
  readonly role: UserRole;

  @ApiProperty({ example: '2000-01-01', description: 'Date of birth' })
  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({
    example: 'Abuja',
    description: 'Student chapter or country state/region for the member',
  })
  @IsNotEmpty()
  @IsString()
  readonly region: string;

  @ApiProperty({
    example: MemberCategory.NIGERIA_STUDENT,
    description: 'Member category for classification and subscription pricing',
    enum: MemberCategory,
  })
  @IsNotEmpty()
  @IsEnum(MemberCategory, { message: 'Invalid member category' })
  readonly memberCategory: MemberCategory;
}
