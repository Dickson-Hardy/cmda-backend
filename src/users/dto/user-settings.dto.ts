import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ description: 'Receive notifications for new messages', example: false })
  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for replies', example: false })
  @IsOptional()
  @IsBoolean()
  replies?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for announcements', example: true })
  @IsOptional()
  @IsBoolean()
  announcements?: boolean;

  @ApiPropertyOptional({ description: 'Allow mobile push notifications', example: true })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Allow email notifications', example: true })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Receive event notifications', example: true })
  @IsOptional()
  @IsBoolean()
  events?: boolean;

  @ApiPropertyOptional({ description: 'Receive payment notifications', example: true })
  @IsOptional()
  @IsBoolean()
  payments?: boolean;

  @ApiPropertyOptional({ description: 'Receive scheduled reminders', example: true })
  @IsOptional()
  @IsBoolean()
  reminders?: boolean;

  @ApiPropertyOptional({ description: 'Receive optional marketing messages', example: false })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}
