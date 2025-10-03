import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateAdminDto } from './dto/create-admin.dto';
import { AdminService } from './admin.service';
import { LoginAdminDto } from './dto/login-admin.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AdminRole, AllAdminRoles } from './admin.constant';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { ForgotPasswordDto } from '../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetches all admins' })
  findAll() {
    return this.adminService.findAll();
  }

  @Post()
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or add new admin' })
  @ApiBody({ type: CreateAdminDto })
  create(@Body() createAdminDto: CreateAdminDto) {
    return this.adminService.create(createAdminDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({ summary: 'Login an admin' })
  @ApiBody({ type: LoginAdminDto })
  login(@Body() loginDto: LoginAdminDto) {
    return this.adminService.login(loginDto);
  }

  @Get('profile')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current admin's profile" })
  findProfile(@Req() req: { user: IJwtPayload }) {
    return this.adminService.findProfile(req.user.id);
  }

  @Patch('profile')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current admin's profile" })
  updateProfile(@Req() req: { user: IJwtPayload }, @Body() updateAdminDto: UpdateAdminDto) {
    return this.adminService.updateProfile(req.user.id, updateAdminDto);
  }

  @Post('profile/change-password')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password of current admin' })
  @ApiBody({ type: ChangeAdminPasswordDto })
  changePassword(
    @Req() req: { user: IJwtPayload },
    @Body() changePasswordDto: ChangeAdminPasswordDto,
  ) {
    return this.adminService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({ summary: 'Sends password reset token to admin email' })
  @ApiBody({ type: ForgotPasswordDto })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.adminService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({ summary: 'Resets the password of the admin' })
  @ApiBody({ type: ResetPasswordDto })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.adminService.resetPassword(resetPasswordDto);
  }

  @Patch('role/:role/:id')
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the role of an admin' })
  updateRole(@Param('id') id: string, @Param('role') role: AdminRole) {
    return this.adminService.updateRole(id, role);
  }

  @Delete(':id')
  @Roles([AdminRole.SUPERADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an admin by id' })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
