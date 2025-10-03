import { IsOptional, IsString, IsEnum, IsBooleanString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventAudience, EventType } from '../events.constant';

export class EventPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search query term', type: String })
  @IsOptional()
  @IsString()
  searchBy?: string;

  @ApiPropertyOptional({ description: 'Search term for event name', type: String })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Number of users per page, default is 10', type: String })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ description: 'Page number, default is 1', type: String })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ description: 'Filter by event type', enum: EventType })
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ description: 'Filter by members group', enum: EventAudience })
  @IsOptional()
  @IsEnum(EventAudience)
  membersGroup?: EventAudience;

  @ApiPropertyOptional({ description: 'Filter by event date', type: String, example: '2024-07-13' })
  @IsOptional()
  @IsString()
  eventDate?: string;

  @ApiPropertyOptional({ description: 'Filter by event date', type: String, example: '2024-07-13' })
  @IsOptional()
  @IsBooleanString()
  fromToday?: boolean;
}
