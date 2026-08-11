import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateDevotionalDto {
  @ApiProperty({ description: 'The title of the devotional', example: 'Updated Devotional Title' })
  @IsOptional()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The updated content of the devotional',
    example: 'Updated devotional content...',
  })
  @IsOptional()
  @IsString()
  content: string;

  @ApiProperty({ description: 'The updated key Bible verse', example: 'John 1:1' })
  @IsString()
  keyVerse: string;

  @ApiProperty({
    description: 'The updated content of the key Bible verse',
    example: 'In the beginning was the Word...',
  })
  @IsOptional()
  @IsString()
  keyVerseContent: string;

  @ApiProperty({
    description: 'Updated prayer points related to the devotional',
    example: 'Pray for wisdom and understanding.',
  })
  @IsOptional()
  @IsString()
  prayerPoints: string;

  @ApiProperty({ description: 'Updated member publication date and time' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
