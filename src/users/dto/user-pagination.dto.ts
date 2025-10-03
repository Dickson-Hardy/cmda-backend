import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../user.constant';

export class UserPaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Search term to filter users by name, email, role, chapters, specialty, licenseNumber, etc',
    type: String,
  })
  @IsOptional()
  @IsString()
  searchBy?: string;

  @ApiPropertyOptional({ description: 'Number of users per page, default is 10', type: String })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Page number, default is 1', type: String })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: "Filter by member's role", enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by region', type: String })
  @IsOptional()
  @IsString()
  region?: string;
}
