import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class CreateReminderDto {
  @ApiProperty({ example: '2026-08-15T09:00:00.000Z' })
  @IsDateString()
  reminderDate: string;

  @ApiPropertyOptional({ example: 'push', enum: ['push', 'email', 'both'] })
  @IsOptional()
  @IsEnum(['push', 'email', 'both'])
  method?: string;
}
