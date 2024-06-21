import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiBody({ type: CreateUserDto })
  signUp(@Body() signUpDto: CreateUserDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginDto })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  getProfile(@Req() id: string) {
    return this.authService.getProfile(id);
  }

  @Patch('me')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  updateProfile(@Req() id: string, @Body() updateProfileDto) {
    return this.authService.updateProfile(id, updateProfileDto);
  }

  @Post('verify-email')
  @Public()
  verifyEmail(@Body() verifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verify-code')
  @Public()
  resendVerifyCode(@Body() resendCodeDto) {
    return this.authService.resendVerifyCode(resendCodeDto);
  }

  @Post('forgot-password')
  @Public()
  forgotPassword(@Body() forgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  resetPassword(@Body() resetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  changePassword(@Req() id, @Body() changePasswordDto) {
    return this.authService.changePassword(id, changePasswordDto);
  }
}
