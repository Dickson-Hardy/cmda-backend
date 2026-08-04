import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteFollowUpDto {
  @ApiPropertyOptional({ description: 'Notes about the completion' })
  @IsOptional()
  @IsString()
  completionNotes?: string;
}
