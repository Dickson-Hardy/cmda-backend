import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'jane.doe@example.com', description: 'Email address of the user' })
  @IsNotEmpty()
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}
