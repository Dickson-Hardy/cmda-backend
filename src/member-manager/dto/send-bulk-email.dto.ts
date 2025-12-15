import { IsString, IsArray, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class SendBulkEmailDto {
  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipientIds?: string[]; // Specific user IDs

  // Filters for dynamic recipient selection
  @IsEnum(['User', 'Elder', 'Pastor', 'Admin', 'MemberManager'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsBoolean()
  @IsOptional()
  isSubscribed?: boolean;

  @IsString()
  @IsOptional()
  membershipType?: string;

  @IsBoolean()
  @IsOptional()
  sendToAll?: boolean;
}
