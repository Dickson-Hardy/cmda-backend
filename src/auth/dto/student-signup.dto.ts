import { IsNotEmpty, IsString } from 'class-validator';
import { BasicSignUpDto } from './basic-signup.dto';

export class StudentSignUpDto extends BasicSignUpDto {
  @IsNotEmpty()
  @IsString()
  chapter: string;

  @IsNotEmpty()
  @IsString()
  admissionYear: string;

  @IsNotEmpty()
  @IsString()
  currentYearOfStudy: string;
}
