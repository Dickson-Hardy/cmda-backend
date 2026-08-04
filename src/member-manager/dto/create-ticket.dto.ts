import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  SUBSCRIPTION = 'subscription',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  GENERAL = 'general',
  OTHER = 'other',
}

export class CreateTicketDto {
  @ApiProperty({ description: 'Member ID' })
  @IsNotEmpty()
  @IsString()
  memberId: string;

  @ApiProperty({ description: 'Title of the ticket' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description of the ticket' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ enum: TicketCategory })
  @IsNotEmpty()
  @IsEnum(TicketCategory)
  category: TicketCategory;
}
