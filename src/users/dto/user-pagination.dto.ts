import { IsOptional, IsString, IsNumberString } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Number of users per page, default is 10' })
  @IsOptional()
  @IsNumberString()
  limit?: number | string;

  @ApiPropertyOptional({ description: 'Page number, default is 1' })
  @IsOptional()
  @IsNumberString()
  page?: number | string;
}
