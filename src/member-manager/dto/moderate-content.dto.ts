import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { ContentType, ModerationAction } from '../schemas/moderation-log.schema';

export class ModerateContentDto {
  @IsNotEmpty()
  @IsString()
  contentId: string;

  @IsNotEmpty()
  @IsEnum(ContentType)
  contentType: ContentType;

  @IsNotEmpty()
  @IsString()
  contentModel: string;

  @IsNotEmpty()
  @IsString()
  contentOwnerId: string;

  @IsNotEmpty()
  @IsEnum(ModerationAction)
  action: ModerationAction;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
