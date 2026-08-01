import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BroadcastReceiverCriteriaDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  searchBy?: string;
}

export class BroadcastMessageDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => BroadcastReceiverCriteriaDto)
  receiverCriteria: BroadcastReceiverCriteriaDto;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must include visible characters' })
  @MaxLength(2000)
  content: string;
}
