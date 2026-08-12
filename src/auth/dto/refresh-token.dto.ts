import { IsIn, IsJWT, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString()
  @IsOptional()
  @IsJWT()
  refreshToken?: string;

  @IsOptional()
  @IsIn(['member', 'admin'])
  client?: 'member' | 'admin';
}
