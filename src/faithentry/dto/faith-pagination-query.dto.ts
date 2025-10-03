import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { FaithEntryCategory } from '../faithentry.constant';

export class FaithPaginationQueryDto {
  @ApiPropertyOptional({
    example: Object.values(FaithEntryCategory).join('| '),
    description: Object.values(FaithEntryCategory).join(', '),
    enum: FaithEntryCategory,
  })
  @IsOptional()
  @IsEnum(FaithEntryCategory, {
    message: 'category must be one of ' + Object.values(FaithEntryCategory).join(', '),
  })
  category?: FaithEntryCategory;

  @ApiPropertyOptional({ description: 'Number of users per page, default is 10', type: String })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Page number, default is 1', type: String })
  @IsOptional()
  @IsString()
  page?: string;
}
