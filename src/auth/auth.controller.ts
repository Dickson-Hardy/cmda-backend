import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
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
import { CheckUserDto } from './dto/check-user.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AllAdminRoles } from '../admin/admin.constant';
import { Throttle } from '@nestjs/throttler';
import { IMAGE_UPLOAD_OPTIONS } from '../_common/image-upload-options';
import { resolveRefreshToken, setRefreshCookie } from './refresh-cookie.util';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Sign up a new user' })
  @ApiBody({ type: CreateUserDto })
  signUp(@Body() signUpDto: CreateUserDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.authService.login(loginDto);
    const tokens = result.data as { refreshToken: string; refreshTokenExpiresAt: Date };
    setRefreshCookie(response, tokens.refreshToken, tokens.refreshTokenExpiresAt);
    return result;
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
  @UseInterceptors(FileInterceptor('avatar', IMAGE_UPLOAD_OPTIONS))
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
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiBody({ type: ForgotPasswordDto })
  resendVerifyCode(@Body() resendCodeDto: ForgotPasswordDto) {
    return this.authService.resendVerifyCode(resendCodeDto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Sends password reset token to email' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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

  @Post('check-user')
  @Public()
  @ApiOperation({ summary: 'Check if user exists by email' })
  @ApiBody({ type: CheckUserDto })
  checkUser(@Body() checkUserDto: CheckUserDto) {
    return this.authService.checkUserExists(checkUserDto);
  }

  @Post('verify-password')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify current user password' })
  @ApiBody({ type: VerifyPasswordDto })
  verifyPassword(@Req() req: { user: IJwtPayload }, @Body() verifyPasswordDto: VerifyPasswordDto) {
    return this.authService.verifyPassword(req.user.id, verifyPasswordDto);
  }

  @Post('logout-all')
  @Roles([...AllUserRoles, ...AllAdminRoles])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign out from all devices' })
  logoutAll(@Req() req: { user: IJwtPayload }) {
    return this.authService.logoutAllDevices(req.user.id, req.user.role);
  }

  @Post('refresh-token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Public()
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshToken(
    @Body() body: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const client = body.client || 'member';
    const result = await this.authService.refreshToken(
      resolveRefreshToken(request, body.refreshToken, client),
    );
    const tokens = result.data as { refreshToken: string; refreshTokenExpiresAt: Date };
    setRefreshCookie(response, tokens.refreshToken, tokens.refreshTokenExpiresAt, client);
    return result;
  }
}
