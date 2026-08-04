import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ShiftVolunteerStatus {
  SIGNED_UP = 'signed_up',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export class UpdateShiftStatusDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsNotEmpty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ShiftVolunteerStatus, example: ShiftVolunteerStatus.COMPLETED })
  @IsNotEmpty()
  @IsEnum(ShiftVolunteerStatus)
  status: ShiftVolunteerStatus;
}
