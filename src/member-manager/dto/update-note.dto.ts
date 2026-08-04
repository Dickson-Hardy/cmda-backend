import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { NoteCategory } from './create-note.dto';

export class UpdateNoteDto {
  @ApiPropertyOptional({ description: 'Content of the note' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: NoteCategory })
  @IsOptional()
  @IsEnum(NoteCategory)
  category?: NoteCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
