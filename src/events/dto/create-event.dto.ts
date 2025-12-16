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
  AllEventAudiencesWithLegacy,
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
    example: [
      EventAudience.DOCTOR_0_5_YEARS,
      EventAudience.DOCTOR_ABOVE_5_YEARS,
      EventAudience.GLOBALNETWORK,
    ],
    description:
      'The audience groups for the event. Use DOCTOR_0_5_YEARS and DOCTOR_ABOVE_5_YEARS for specific doctor categories, or DOCTOR for both (legacy support).',
    isArray: true,
    enum: AllEventAudiencesWithLegacy,
    default: [
      EventAudience.STUDENT,
      EventAudience.DOCTOR_0_5_YEARS,
      EventAudience.DOCTOR_ABOVE_5_YEARS,
      EventAudience.GLOBALNETWORK,
    ],
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

  @ApiProperty({
    example: true,
    description: 'Whether users need an active subscription to register for this event',
    required: false,
  })
  @IsBooleanString()
  @IsOptional()
  requiresSubscription?: boolean;

  // Virtual meeting fields
  @ApiProperty({
    example: 'Zoom',
    description: 'Virtual meeting platform (Zoom, Google Meet, Microsoft Teams, etc.)',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingPlatform?: string;

  @ApiProperty({
    example: 'https://zoom.us/j/123456789',
    description: 'Direct link to join the virtual meeting',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingLink?: string;

  @ApiProperty({
    example: '123 456 789',
    description: 'Meeting ID for platforms like Zoom',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingId?: string;

  @ApiProperty({
    example: 'pass123',
    description: 'Meeting passcode or password',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingPasscode?: string;

  @ApiProperty({
    example: '+1 234 567 8900',
    description: 'Dial-in phone numbers if available',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingDialIn?: string;

  @ApiProperty({
    example: 'Please join 5 minutes early',
    description: 'Additional instructions for joining the virtual meeting',
    required: false,
  })
  @IsString()
  @IsOptional()
  virtualMeetingInstructions?: string;
}
