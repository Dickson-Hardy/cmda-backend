import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { AllEventAudiences, EventAudience, EventTag, EventType } from '../events.constant';

export class CreateEventDto {
  @ApiProperty({ example: 'Sample Event', description: 'The name of the event', uniqueItems: true })
  @IsString()
  name: string;

  @ApiProperty({ example: 'This is a sample event.', description: 'The description of the event' })
  @IsString()
  description: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Featured image of the product as a file',
  })
  featuredImage: any;

  @ApiProperty({
    example: EventType.VIRTUAL,
    description: 'The type of the event',
    enum: EventType,
  })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({
    example: 'https://example.com/event',
    description: 'The link or location of the event',
  })
  @IsString()
  linkOrLocation: string;

  @ApiProperty({ example: '12345', description: 'The access code for the event', required: false })
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiProperty({ example: '2024-07-29T10:00:00Z', description: 'The date and time of the event' })
  @IsDateString()
  eventDateTime: Date;

  @ApiProperty({
    example: [EventTag.CONFERENCE, EventTag.SEMINAR],
    description: 'The tags for the event',
    isArray: true,
  })
  @IsArray()
  @IsEnum(EventTag, { each: true })
  eventTags: EventTag[];

  @ApiProperty({
    example: [EventAudience.DOCTOR, EventAudience.GLOBALNETWORK],
    description: 'The audience groups for the event',
    isArray: true,
    default: AllEventAudiences,
  })
  @IsArray()
  @IsEnum(EventAudience, { each: true })
  @IsOptional()
  membersGroup?: EventAudience[];

  @ApiProperty({
    example: 'Some additional information',
    description: 'Any additional information for the event',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalInformation?: string;
}
