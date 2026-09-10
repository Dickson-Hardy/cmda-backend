import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChapterType } from '../chapters.schema';

export class ChapterQueryDto {
  @ApiPropertyOptional({ enum: ChapterType })
  @IsOptional()
  @Transform(({ value }) => (value === 'GlobalNetwork' ? ChapterType.GLOBAL : value))
  @IsEnum(ChapterType)
  type?: ChapterType;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Chapters per page', default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
