import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class ToggleReactionDto {
  @ApiProperty({ example: 'event', enum: ['event', 'faith_entry'] })
  @IsEnum(['event', 'faith_entry'])
  parentType: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  parentId: string;

  @ApiProperty({ example: 'like', enum: ['like', 'pray', 'amen', 'heart', 'hallelujah'] })
  @IsEnum(['like', 'pray', 'amen', 'heart', 'hallelujah'])
  type: string;
}
