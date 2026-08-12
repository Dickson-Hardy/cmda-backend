import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class LifetimeMemberImportRowDto {
  @IsInt()
  @Min(2)
  rowNumber: number;

  @IsString()
  @MaxLength(200)
  fullName: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  chapter?: string;
}

export class PreviewLifetimeMemberImportDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => LifetimeMemberImportRowDto)
  rows: LifetimeMemberImportRowDto[];
}

export class ConfirmLifetimeMemberImportRowDto extends LifetimeMemberImportRowDto {
  @IsMongoId()
  userId: string;
}

export class ConfirmLifetimeMemberImportDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => ConfirmLifetimeMemberImportRowDto)
  rows: ConfirmLifetimeMemberImportRowDto[];
}
