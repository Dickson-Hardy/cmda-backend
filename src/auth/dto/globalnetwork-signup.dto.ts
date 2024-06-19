import { IsNotEmpty, IsString } from 'class-validator';
import { BasicSignUpDto } from './basic-signup.dto';

export class GlobalNetworkSignUpDto extends BasicSignUpDto {
  @IsNotEmpty()
  @IsString()
  readonly country: string;

  @IsNotEmpty()
  @IsString()
  readonly state: string;

  @IsNotEmpty()
  @IsString()
  readonly icenseNumber: string;

  @IsNotEmpty()
  @IsString()
  readonly specialty: string;
}
