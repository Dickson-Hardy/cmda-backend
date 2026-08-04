import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({ example: 'Morning Registration Desk' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: '2025-08-15T08:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2025-08-15T12:00:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 'Main Hall, Building A' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 10 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  maxVolunteers: number;

  @ApiPropertyOptional({ example: 'Bring your own water bottle.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
