import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResourceCategory } from '../resources.constant';

export class ResourcePaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query term', type: String })
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

  @ApiPropertyOptional({
    description: 'Type of the resource',
    enum: ResourceCategory,
  })
  @IsOptional()
  @IsEnum(ResourceCategory)
  category: ResourceCategory;
}
