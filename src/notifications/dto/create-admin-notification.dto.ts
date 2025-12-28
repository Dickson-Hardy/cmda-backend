import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, TargetType } from '../admin-notification.schema';

export class CreateAdminNotificationDto {
  @ApiProperty({ description: 'Notification title', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title: string;

  @ApiProperty({ description: 'Notification body', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  body: string;

  @ApiProperty({
    description: 'Notification type',
    enum: ['announcement', 'event_reminder', 'payment_reminder', 'custom'],
  })
  @IsEnum(['announcement', 'event_reminder', 'payment_reminder', 'custom'])
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Target type for notification',
    enum: ['all', 'role', 'region', 'user'],
  })
  @IsEnum(['all', 'role', 'region', 'user'])
  @IsNotEmpty()
  targetType: TargetType;

  @ApiPropertyOptional({
    description: 'Target value (role name, region code, or user ID)',
  })
  @IsString()
  @IsOptional()
  targetValue?: string;

  @ApiPropertyOptional({ description: 'Scheduled delivery time (ISO date string)' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Additional data payload' })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
