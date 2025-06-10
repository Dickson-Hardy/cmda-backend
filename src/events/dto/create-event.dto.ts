import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBooleanString,
} from 'class-validator';
import {
  AllEventAudiences,
  EventAudience,
  EventTag,
  EventType,
  ConferenceType,
  ConferenceZone,
  ConferenceRegion,
} from '../events.constant';

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

  @ApiProperty({ example: false, description: 'paid of free event' })
  @IsBooleanString()
  isPaid: boolean;

  @ApiProperty({
    description: 'The payment plans for the event',
  })
  @IsString()
  @IsOptional()
  paymentPlans?: string;

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

  // Conference-specific fields
  @ApiProperty({
    example: false,
    description: 'Whether this is a conference',
    required: false,
  })
  @IsBooleanString()
  @IsOptional()
  isConference?: boolean;

  @ApiProperty({
    example: ConferenceType.NATIONAL,
    description: 'The type of conference',
    enum: ConferenceType,
    required: false,
  })
  @IsEnum(ConferenceType)
  @IsOptional()
  conferenceType?: ConferenceType;

  @ApiProperty({
    example: ConferenceZone.WESTERN,
    description: 'The zone for zonal conferences',
    enum: ConferenceZone,
    required: false,
  })
  @IsEnum(ConferenceZone)
  @IsOptional()
  conferenceZone?: ConferenceZone;

  @ApiProperty({
    example: ConferenceRegion.UK_EUROPE,
    description: 'The region for regional conferences',
    enum: ConferenceRegion,
    required: false,
  })
  @IsEnum(ConferenceRegion)
  @IsOptional()
  conferenceRegion?: ConferenceRegion;

  @ApiProperty({
    example: '2024-06-15T23:59:59Z',
    description: 'End date for regular registration',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  regularRegistrationEndDate?: Date;

  @ApiProperty({
    example: '2024-07-15T23:59:59Z',
    description: 'End date for late registration',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  lateRegistrationEndDate?: Date;

  @ApiProperty({
    example: 'SPL_xxxxxx',
    description: 'Paystack split code for revenue sharing',
    required: false,
  })
  @IsString()
  @IsOptional()
  paystackSplitCode?: string;

  @ApiProperty({
    example: false,
    description: 'Use PayPal for global network payments',
    required: false,
  })
  @IsBooleanString()
  @IsOptional()
  usePayPalForGlobal?: boolean;
}
