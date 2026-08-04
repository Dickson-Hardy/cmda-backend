import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great event!', maxLength: 1000 })
  @IsString()
  @MaxLength(1000)
  content: string;

  @ApiProperty({ example: 'event', enum: ['event', 'faith_entry'] })
  @IsEnum(['event', 'faith_entry'])
  parentType: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  parentId: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
