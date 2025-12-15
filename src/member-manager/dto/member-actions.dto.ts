import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class BanMemberDto {
  @IsNotEmpty()
  @IsBoolean()
  isBanned: boolean;

  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class DeactivateMemberDto {
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class VerifyMemberDto {
  @IsNotEmpty()
  @IsBoolean()
  isVerified: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
