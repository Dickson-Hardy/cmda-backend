import { IsNotEmpty, IsString, IsEmail, MinLength } from 'class-validator';
// import { UserGender, UserRole } from 'src/users/schemas/users.schema';

export class BasicSignUpDto {
  @IsNotEmpty()
  @IsString()
  readonly firstName: string;

  @IsNotEmpty()
  @IsString()
  readonly lastName: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  readonly email: string;

  @IsNotEmpty()
  @MinLength(8)
  readonly password: string;

  // @IsNotEmpty()
  // @IsEnum(UserGender, { message: 'Enter a correct gender' })
  // readonly gender: UserGender;

  // @IsNotEmpty()
  // @IsEnum(UserRole, { message: 'Enter a correct role' })
  // readonly role: UserRole;
}
