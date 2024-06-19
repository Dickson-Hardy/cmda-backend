import { IsNotEmpty, IsString } from 'class-validator';
import { BasicSignUpDto } from './basic-signup.dto';

export class DoctorSignUpDto extends BasicSignUpDto {
  @IsNotEmpty()
  @IsString()
  readonly region: string;

  @IsNotEmpty()
  @IsString()
  readonly licenseNumber: string;

  @IsNotEmpty()
  @IsString()
  readonly specialty: string;
}
