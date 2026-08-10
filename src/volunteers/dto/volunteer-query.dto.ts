import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VolunteerJobCategory } from './create-volunteer-job.dto';

export class VolunteerQueryDto {
  @ApiPropertyOptional({ description: 'Page number, default is 1', type: String })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Number of items per page, default is 10', type: String })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Search query term', type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Legacy alias for search', type: String })
  @IsOptional()
  @IsString()
  searchBy?: string;

  @ApiPropertyOptional({ enum: VolunteerJobCategory, description: 'Filter by category' })
  @IsOptional()
  @IsEnum(VolunteerJobCategory)
  category?: VolunteerJobCategory;
}
