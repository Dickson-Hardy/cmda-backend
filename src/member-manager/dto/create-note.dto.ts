import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export enum NoteCategory {
  GENERAL = 'general',
  SUPPORT = 'support',
  SUBSCRIPTION = 'subscription',
  FOLLOWUP = 'followup',
  OTHER = 'other',
}

export class CreateNoteDto {
  @ApiProperty({ description: 'Content of the note' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: NoteCategory, default: NoteCategory.GENERAL })
  @IsOptional()
  @IsEnum(NoteCategory)
  category?: NoteCategory;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
