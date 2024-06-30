import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AdminRole } from '../admin.constant';

export class UpdateAdminRoleDto {
  @ApiProperty({
    example: 'SuperAdmin, Admin or FinanceAdmin',
    description: 'Role of the admin',
    enum: AdminRole,
  })
  @IsNotEmpty()
  @IsEnum(AdminRole, { message: 'role must be one of SuperAdmin, Admin or FinanceAdmin' })
  role: AdminRole;
}
