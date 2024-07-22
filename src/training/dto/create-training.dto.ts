import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../users/user.constant';

export class CreateTrainingDto {
  @ApiProperty({ description: 'The unique name of the training', uniqueItems: true })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'The description of the training' })
  @IsOptional()
  @IsString()
  description: string;

  @ApiProperty({ description: 'The group of members eligible for the training', enum: UserRole })
  @IsNotEmpty()
  @IsEnum(UserRole)
  membersGroup?: UserRole;
}
