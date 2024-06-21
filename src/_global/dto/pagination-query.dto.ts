import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query keyword', type: String })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: 'Number of items per page', minimum: 1, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Current page number', minimum: 1, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}
