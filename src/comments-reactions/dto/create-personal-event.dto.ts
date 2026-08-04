import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePersonalEventDto {
  @ApiProperty({ example: 'My Birthday' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Celebrating another year' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-08-15T00:00:00.000Z' })
  @IsDateString()
  eventDate: string;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: 'birthday', enum: ['birthday', 'milestone', 'reminder', 'other'] })
  @IsOptional()
  @IsEnum(['birthday', 'milestone', 'reminder', 'other'])
  category?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;
}
