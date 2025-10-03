import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'full name of the admin' })
  @IsString()
  fullName: string;
}
