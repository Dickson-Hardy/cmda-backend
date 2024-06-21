import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';
import { AdminRole } from '../admin.constant';

export class CreateAdminDto {
  @ApiProperty({ example: 'John Doe', description: 'full name of the admin' })
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'johndoe@gmail.com', description: 'Email address of the admin' })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'Pass@123',
    description: 'Strong password for the user',
    minLength: 8,
    required: false,
  })
  @IsOptional()
  @MinLength(8)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minNumbers: 1, minSymbols: 1, minUppercase: 1 },
    { message: 'Password must contain at least one uppercase, lowercase, number & special chars' },
  )
  password: string;

  @ApiProperty({
    example: 'SuperAdmin, Admin or FinanceAdmin',
    description: 'Role of the admin',
    enum: AdminRole,
  })
  @IsNotEmpty()
  @IsEnum(AdminRole, { message: 'role must be one of SuperAdmin, Admin or FinanceAdmin' })
  role: AdminRole;
}
