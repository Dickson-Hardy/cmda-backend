import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  // Some React Native fetch implementations append this cache-buster when
  // `cache: "no-cache"` is used. Accept it for compatibility with older apps.
  @IsOptional()
  @IsString()
  _?: string;

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
}
