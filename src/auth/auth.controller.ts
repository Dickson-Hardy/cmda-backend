import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ISuccessResponse } from '../interfaces/success-response';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  // swagger
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiResponse({ status: 201, description: 'The user has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiBody({ type: CreateUserDto })
  //
  async signUp(@Body() signUpDto: CreateUserDto): Promise<ISuccessResponse> {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  // swagger
  @ApiOperation({ summary: 'Login a user' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiBody({ type: LoginDto })
  //
  async login(@Body() loginDto: LoginDto): Promise<ISuccessResponse> {
    return this.authService.login(loginDto);
  }
}
