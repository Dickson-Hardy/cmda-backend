import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsEnum } from 'class-validator';

export enum CommunicationType {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  IN_PERSON = 'in-person',
  OTHER = 'other',
}

export enum CommunicationDirection {
  OUTGOING = 'outgoing',
  INCOMING = 'incoming',
}

export class LogCommunicationDto {
  @ApiProperty({ description: 'Member ID' })
  @IsNotEmpty()
  @IsString()
  memberId: string;

  @ApiProperty({ enum: CommunicationType })
  @IsNotEmpty()
  @IsEnum(CommunicationType)
  type: CommunicationType;

  @ApiProperty({ description: 'Subject of the communication' })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Content of the communication' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: CommunicationDirection, default: CommunicationDirection.OUTGOING })
  @IsOptional()
  @IsEnum(CommunicationDirection)
  direction?: CommunicationDirection;

  @ApiPropertyOptional({ default: 'sent' })
  @IsOptional()
  @IsString()
  status?: string;
}
