import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyPasswordDto {
  @ApiProperty({ description: 'User password to verify' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
