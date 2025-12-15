import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../_global/dto/pagination-query.dto';
import { EmailStatus, EmailType } from '../../email/email-log.schema';

export class GetEmailLogsDto extends PaginationQueryDto {
  @ApiProperty({ required: false, enum: EmailStatus })
  @IsOptional()
  @IsEnum(EmailStatus)
  status?: EmailStatus;

  @ApiProperty({ required: false, enum: EmailType })
  @IsOptional()
  @IsEnum(EmailType)
  type?: EmailType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recipient?: string;
}
