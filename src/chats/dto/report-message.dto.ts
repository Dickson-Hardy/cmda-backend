import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ReportMessageDto {
  @IsString()
  @MinLength(3)
  @Matches(/\S/, { message: 'reason must include visible characters' })
  @MaxLength(500)
  reason: string;
}
