import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ description: 'Receive notifications for new messages', example: false })
  @IsOptional()
  @IsBoolean()
  newMessage: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for replies', example: false })
  @IsOptional()
  @IsBoolean()
  replies: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for announcements', example: true })
  @IsOptional()
  @IsBoolean()
  announcements: boolean;
}
