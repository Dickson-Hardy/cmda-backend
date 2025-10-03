import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class ConfirmEventPayDto {
  @ApiProperty({ example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({ example: 'paypal' })
  @IsString()
  @IsOptional()
  source?: string;
}
