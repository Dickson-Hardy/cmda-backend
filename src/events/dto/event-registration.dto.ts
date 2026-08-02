import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsObject } from 'class-validator';

export class EventRegistrationDto {
  @ApiPropertyOptional({
    description: 'Accommodation option selected for this conference registration',
    example: 'standard-room',
  })
  @IsString()
  @IsOptional()
  accommodationOptionId?: string;

  @ApiPropertyOptional({
    description: 'Responses to administrator-configured registration fields',
    example: { 'dietary-needs': 'Vegetarian' },
  })
  @IsObject()
  @IsOptional()
  customResponses?: Record<string, unknown>;
}
