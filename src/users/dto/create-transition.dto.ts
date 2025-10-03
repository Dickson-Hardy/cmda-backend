import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateUserTransitionDto {
  @ApiProperty({ example: 'e.g. Kogi', description: 'doctor chapter or region' })
  @IsNotEmpty()
  @IsString()
  readonly region: string;

  @ApiProperty({ description: 'License number for the docto' })
  @IsNotEmpty()
  @IsString()
  readonly licenseNumber: string;

  @ApiProperty({ example: 'Dentist', description: 'Specialty for the doctor' })
  @IsNotEmpty()
  @IsString()
  readonly specialty: string;
}
