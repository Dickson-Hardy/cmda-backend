import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ChapterType } from '../chapters.schema';

export class CreateChapterDto {
  @ApiProperty({ example: 'Lagos University Teaching Hospital - LUTH' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ChapterType, example: ChapterType.STUDENT })
  @IsNotEmpty()
  @IsEnum(ChapterType)
  type: ChapterType;

  @ApiProperty({ example: 'Main student chapter in Lagos', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Lagos, Nigeria', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: true, required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
