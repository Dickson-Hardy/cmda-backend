import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, ArrayNotEmpty } from 'class-validator';

export class UpdateCompletedUsersDto {
  @ApiProperty({
    description: 'Array of email addresses of users who completed the training',
    example: ['user1@example.com', 'user2@example.com'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  completedUsers: string[];
}
