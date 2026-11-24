import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WebPushKeysDto {
  @ApiProperty({ description: 'p256dh key from PushSubscription.toJSON()' })
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @ApiProperty({ description: 'auth secret from PushSubscription.toJSON()' })
  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class RegisterWebPushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  endpoint: string;

  @ApiProperty({ type: WebPushKeysDto })
  @ValidateNested()
  @Type(() => WebPushKeysDto)
  keys: WebPushKeysDto;

  @ApiPropertyOptional({ description: 'Subscription expiration timestamp, if provided by the browser' })
  @IsOptional()
  @IsNumber()
  expirationTime?: number;
}
