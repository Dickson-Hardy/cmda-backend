import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ActivateLifetimeDto {
  @ApiProperty({ description: 'Whether the member is Nigerian' })
  @IsNotEmpty()
  @IsBoolean()
  isNigerian: boolean;

  @ApiPropertyOptional({ description: 'Type of lifetime membership' })
  @IsOptional()
  @IsString()
  lifetimeType?: string;
}
