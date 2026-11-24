import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RemoveWebPushDto {
  @ApiProperty({ description: 'Push subscription endpoint URL to remove' })
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  endpoint: string;
}
