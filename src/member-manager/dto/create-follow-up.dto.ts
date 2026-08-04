import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum FollowUpPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export class CreateFollowUpDto {
  @ApiProperty({ description: 'Member ID' })
  @IsNotEmpty()
  @IsString()
  memberId: string;

  @ApiProperty({ description: 'Title of the follow-up' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the follow-up' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ description: 'Due date for the follow-up' })
  @IsNotEmpty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ enum: FollowUpPriority, default: FollowUpPriority.MEDIUM })
  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;
}
