import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Notes about the completion' })
  @IsOptional()
  @IsString()
  completionNotes?: string;

  @ApiPropertyOptional({ description: 'Actual hours spent on the task' })
  @IsOptional()
  @IsNumber()
  actualHours?: number;
}
