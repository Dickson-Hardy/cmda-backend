import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/user.constant';

export class TrainingQueryDto {
  @ApiPropertyOptional({ description: 'Search query term', type: String })
  @IsOptional()
  @IsString()
  searchBy?: string;

  @ApiPropertyOptional({ description: 'Filter by members group', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  membersGroup?: UserRole;
}
