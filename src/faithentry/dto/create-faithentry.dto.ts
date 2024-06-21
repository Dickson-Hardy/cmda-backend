import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { FaithEntryCategory } from '../faithentry.constant';

export class CreateFaithEntryDto {
  @ApiProperty({ example: 'Lorem ipsum dolor sit amet...' })
  @IsString()
  content: string;

  @ApiProperty({ example: 'Testimony | Prayer' })
  @IsString()
  category: FaithEntryCategory;

  @ApiProperty({ example: false })
  @IsString()
  isAnonymous: string;
}
