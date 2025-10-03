import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.constant';

export class ExportUsersDto {
  @ApiPropertyOptional({ description: "Filter by member's role", enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by region', type: String })
  @IsOptional()
  @IsString()
  region?: string;
}
