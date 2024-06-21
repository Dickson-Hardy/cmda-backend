import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsNotEmpty, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', description: "The user's current password" })
  @IsNotEmpty()
  @IsString()
  oldPassword: string;

  @ApiProperty({ example: 'NewPassword456!', description: "The user's new password" })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minNumbers: 1, minSymbols: 1, minUppercase: 1 },
    {
      message: 'newPassword must contain at least one uppercase, lowercase, number & special chars',
    },
  )
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword456!',
    description: "Confirmation of the user's new password",
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @IsStrongPassword(
    { minLength: 8, minLowercase: 1, minNumbers: 1, minSymbols: 1, minUppercase: 1 },
    {
      message:
        'confirmPassword must contain at least one uppercase, lowercase, number & special chars',
    },
  )
  confirmPassword: string;
}
