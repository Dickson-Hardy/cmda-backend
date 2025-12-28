import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Expo push token', example: 'ExponentPushToken[xxxxxx]' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Device platform', enum: ['ios', 'android'] })
  @IsEnum(['ios', 'android'])
  @IsNotEmpty()
  platform: 'ios' | 'android';

  @ApiProperty({ description: 'Unique device identifier' })
  @IsString()
  @IsNotEmpty()
  deviceId: string;
}
