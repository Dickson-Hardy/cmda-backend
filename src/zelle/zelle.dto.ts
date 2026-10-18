import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ZelleAreaDto {
  @IsString() @MinLength(1) @MaxLength(120) name: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount: number;
}

export class ZelleSettingsDto {
  @IsBoolean() enabled: boolean;
  @IsString() @MaxLength(120) accountName: string;
  @IsString() @MaxLength(120) recipient: string;
  @IsString() @MaxLength(1000) instructions: string;
}

export class CreateZelleDto {
  @IsIn(['SUBSCRIPTION', 'DONATION']) context: 'SUBSCRIPTION' | 'DONATION';
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1000000) amount: number;
  @IsOptional() @IsString() @MaxLength(50) incomeBracket?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(2000) @Max(2100) targetYear?: number;
  @IsOptional() @IsString() @MaxLength(120) purpose?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ZelleAreaDto)
  areasOfNeed?: ZelleAreaDto[];
}

export class ZelleProofDto {
  @IsString() @MinLength(3) @MaxLength(120) transferReference: string;
}

export class ReviewZelleDto {
  @IsIn(['approve', 'reject']) decision: 'approve' | 'reject';
  @IsString() @MinLength(3) @MaxLength(500) note: string;
}
