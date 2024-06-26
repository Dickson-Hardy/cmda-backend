import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
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
    example: 'SuperAdmin, Admin or FinanceAdmin',
    description: 'Role of the admin',
    enum: AdminRole,
  })
  @IsNotEmpty()
  @IsEnum(AdminRole, { message: 'role must be one of SuperAdmin, Admin or FinanceAdmin' })
  role: AdminRole;
}
