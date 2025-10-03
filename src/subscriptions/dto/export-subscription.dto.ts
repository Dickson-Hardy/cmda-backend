import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExportSubscriptionsDto {
  @ApiPropertyOptional({ description: 'Filter by user Id', type: String })
  @IsOptional()
  @IsString()
  userId?: string;
}
