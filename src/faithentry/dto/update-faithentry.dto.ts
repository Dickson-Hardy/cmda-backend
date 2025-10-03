import { IsOptional, IsString } from 'class-validator';
import { FaithEntryCategory } from '../faithentry.constant';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFaithEntryDto {
  @ApiProperty({ example: 'Lorem ipsum dolor sit amet...' })
  @IsOptional()
  @IsString()
  content: string;

  @ApiProperty({ example: 'Testimony | Prayer' })
  @IsOptional()
  @IsString()
  category: FaithEntryCategory;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsString()
  isAnonymous: string;
}
