import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Recipient user id, or admin' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'content must include visible characters' })
  @Matches(/^(admin|[a-f\d]{24})$/i, { message: 'receiver must be a valid user id or admin' })
  receiver: string;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Client-generated idempotency key' })
  @IsOptional()
  @IsUUID('4')
  clientMessageId?: string;
}
