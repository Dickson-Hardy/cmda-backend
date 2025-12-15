import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum BulkEmailRecipientType {
  ALL_USERS = 'ALL_USERS',
  UNPAID_SUBSCRIPTIONS = 'UNPAID_SUBSCRIPTIONS',
  EXPIRED_SUBSCRIPTIONS = 'EXPIRED_SUBSCRIPTIONS',
  CUSTOM_LIST = 'CUSTOM_LIST',
}

export class SendBulkEmailDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  body: string;

  @ApiProperty({ enum: BulkEmailRecipientType })
  @IsNotEmpty()
  @IsEnum(BulkEmailRecipientType)
  recipientType: BulkEmailRecipientType;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  customEmails?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
