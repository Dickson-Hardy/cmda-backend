import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
}
