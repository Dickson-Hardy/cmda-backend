import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDevotionalDto {
  @ApiProperty({ description: 'The title of the devotional', example: 'Daily Devotional' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'The content of the devotional',
    example: 'Lorem ipsum dolor sit amet...',
  })
  @IsString()
  content: string;

  @ApiProperty({ description: 'The key Bible verse', example: 'John 3:16' })
  @IsString()
  keyVerse: string;

  @ApiProperty({
    description: 'The content of the key Bible verse',
    example: 'For God so loved the world...',
  })
  @IsString()
  keyVerseContent: string;

  @ApiProperty({
    description: 'Prayer points related to the devotional',
    example: 'Pray for unity among believers.',
  })
  @IsString()
  prayerPoints: string;
}
