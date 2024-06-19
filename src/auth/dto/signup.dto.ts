// import { BasicSignUpDto } from './basic-signup.dto';
// import { DoctorSignUpDto } from './doctor-signup.dto';
// import { GlobalNetworkSignUpDto } from './globalnetwork-signup.dto';
// import { StudentSignUpDto } from './student-signup.dto';

// export type SignUpDto = BasicSignUpDto;
//   | StudentSignUpDto
//   | DoctorSignUpDto
//   | GlobalNetworkSignUpDto;

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Please enter correct email' })
  readonly email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  readonly password: string;
}
