import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from './decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { Public } from './decorators/public.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password-dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { FileInterceptor } from '@nestjs/platform-express';

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
  @ApiOperation({ summary: 'Returns profile of current user' })
  getProfile(@Req() req: { user: IJwtPayload }) {
    return this.authService.getProfile(req.user.id);
  }

  @Patch('me')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Updates profile of current user' })
  @ApiBody({ type: UpdateUserDto })
  @UseInterceptors(FileInterceptor('avatar'))
  updateProfile(
    @Req() req: { user: IJwtPayload },
    @Body() updateProfileDto: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return this.authService.updateProfile(req.user.id, updateProfileDto, avatar);
  }

  @Post('verify-email')
  @Public()
  @ApiOperation({ summary: "Verify user's email account" })
  @ApiBody({ type: VerifyEmailDto })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-verify-code')
  @Public()
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({ type: ForgotPasswordDto })
  resendVerifyCode(@Body() resendCodeDto: ForgotPasswordDto) {
    return this.authService.resendVerifyCode(resendCodeDto);
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Sends password reset token to email' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Resets the password of the user' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password of current user' })
  @ApiBody({ type: ChangePasswordDto })
  changePassword(@Req() req: { user: IJwtPayload }, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }
}
