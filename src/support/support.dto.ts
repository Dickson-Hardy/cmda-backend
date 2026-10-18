import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SUPPORT_STATUSES = ['open', 'in_progress', 'awaiting_member', 'resolved'] as const;
export const SUPPORT_CATEGORIES = [
  'account',
  'profile',
  'payments',
  'technical',
  'general',
] as const;
const trim = ({ value }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSupportDto {
  @IsUUID() submissionId: string;
  @Matches(/^[a-f0-9]{64}$/) accessToken: string;
  @IsIn(['complaint', 'feedback']) kind: string;
  @IsIn(SUPPORT_CATEGORIES) category: string;
  @Transform(trim) @IsString() @Length(2, 100) name: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email: string;
  @Transform(trim) @IsString() @Length(5, 150) subject: string;
  @Transform(trim) @IsString() @Length(10, 5000) message: string;
  @IsIn(['cmdanigeria.net', 'cmdanigeria.org']) source: string;
  @IsOptional() @IsString() @MaxLength(0) website?: string;
}

export class SupportReplyDto {
  @Transform(trim) @IsString() @Length(2, 5000) message: string;
  @IsUUID() messageId: string;
  @Type(() => Number) @IsInt() @Min(0) version: number;
}

export class UpdateSupportDto {
  @IsIn(SUPPORT_STATUSES) status: string;
  @IsIn(['keep', 'me', 'unassigned']) assignment: string;
  @Type(() => Number) @IsInt() @Min(0) version: number;
}

export class SupportQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) @IsOptional() limit = 15;
  @IsIn(SUPPORT_STATUSES) @IsOptional() status?: string;
  @IsIn(['complaint', 'feedback']) @IsOptional() kind?: string;
  @IsIn(['cmdanigeria.net', 'cmdanigeria.org']) @IsOptional() source?: string;
  @IsString() @MaxLength(100) @IsOptional() search?: string;
}
