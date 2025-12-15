import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
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
import { PaystackService } from '../paystack/paystack.service';
import { BulkEmailService } from './bulk-email.service';
import { SendBulkEmailDto } from './dto/send-bulk-email.dto';
import { GetEmailLogsDto } from './dto/get-email-logs.dto';
import { CreateMemberByAdminDto } from './dto/create-member-by-admin.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private paystackService: PaystackService,
    private bulkEmailService: BulkEmailService,
  ) {}

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

  @Get('paystack/search')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Paystack transactions by email' })
  async searchPaystackTransactions(
    @Query('email') email: string,
    @Query('page') page?: number,
    @Query('perPage') perPage?: number,
  ) {
    return this.paystackService.searchTransactionsByEmail(
      email,
      page ? Number(page) : 1,
      perPage ? Number(perPage) : 50,
    );
  }

  @Post('emails/bulk-send')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send bulk emails to users' })
  @ApiBody({ type: SendBulkEmailDto })
  sendBulkEmails(@Body() dto: SendBulkEmailDto) {
    return this.bulkEmailService.sendBulkEmails(dto);
  }

  @Post('emails/subscription-reminders')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send subscription renewal reminders' })
  sendSubscriptionReminders() {
    return this.bulkEmailService.sendSubscriptionReminders();
  }

  @Get('emails/logs')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email logs with filters' })
  getEmailLogs(@Query() query: GetEmailLogsDto) {
    return this.bulkEmailService.getEmailLogs(query);
  }

  @Get('emails/queue-status')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email queue status' })
  getQueueStatus() {
    return this.bulkEmailService.getQueueStatus();
  }

  @Post('members/create')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new member with temporary password' })
  @ApiBody({ type: CreateMemberByAdminDto })
  createMember(@Body() createMemberDto: CreateMemberByAdminDto) {
    return this.adminService.createMemberByAdmin(createMemberDto);
  }

  @Get('members/analytics')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics for admin-created members' })
  getMemberAnalytics() {
    return this.adminService.getMemberAnalytics();
  }

  @Get('members/track-email/:userId')
  @ApiOperation({ summary: 'Track email open for member credential email' })
  trackEmailOpen(@Param('userId') userId: string) {
    return this.adminService.trackEmailOpen(userId);
  }

  @Post('members/send-reminders')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER])
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Send password change reminder emails to members who haven't changed password",
  })
  sendPasswordChangeReminders() {
    return this.adminService.sendPasswordChangeReminders();
  }
}
