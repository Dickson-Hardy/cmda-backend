import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UserPaginationQueryDto {
  @ApiPropertyOptional({ description: 'filter record by fullName', type: String })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ description: 'number of items per page', minimum: 1, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'current page number', minimum: 1, type: Number })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;
}
