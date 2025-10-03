import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';
import { FaithEntryCategory } from '../faithentry.constant';

export class CreateFaithEntryDto {
  @ApiProperty({ example: 'Lorem ipsum dolor sit amet...' })
  @IsString()
  content: string;

  @ApiProperty({ example: Object.values(FaithEntryCategory).join('|') })
  @IsString()
  category: FaithEntryCategory;

  @ApiProperty({ example: false })
  @IsBoolean()
  isAnonymous: boolean;
}
