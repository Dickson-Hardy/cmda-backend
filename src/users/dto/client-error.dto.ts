import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ClientErrorDto {
  @IsString()
  @MaxLength(500)
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  stack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  componentStack?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  appVersion?: string;
}
