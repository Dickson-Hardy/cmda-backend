import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MemberManagerService } from './member-manager.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.constant';

@Controller('member-manager')
@UseGuards(AuthGuard, RolesGuard)
@Roles([UserRole.MEMBERMANAGER, UserRole.ADMIN])
export class MemberManagerController {
  constructor(private readonly memberManagerService: MemberManagerService) {}

  // Members
  @Get('members')
  async getAllMembers(@Query() query: any) {
    return this.memberManagerService.getAllMembers(query);
  }

  @Get('members/stats')
  async getMemberStats() {
    return this.memberManagerService.getMemberStats();
  }

  @Get('members/:id')
  async getMemberById(@Param('id') id: string) {
    return this.memberManagerService.getMemberById(id);
  }

  @Get('members/export')
  async exportMembers(@Query() query: any) {
    return this.memberManagerService.exportMembers(query);
  }

  // Notes
  @Get('notes/:memberId')
  async getMemberNotes(@Param('memberId') memberId: string) {
    return this.memberManagerService.getMemberNotes(memberId);
  }

  @Post('notes/:memberId')
  async createNote(@Param('memberId') memberId: string, @Body() body: any, @Req() req: any) {
    return this.memberManagerService.createNote(memberId, body, req.user._id);
  }

  @Patch('notes/:noteId')
  async updateNote(@Param('noteId') noteId: string, @Body() body: any) {
    return this.memberManagerService.updateNote(noteId, body);
  }

  @Delete('notes/:noteId')
  async deleteNote(@Param('noteId') noteId: string) {
    return this.memberManagerService.deleteNote(noteId);
  }

  // Communications
  @Get('communications')
  async getAllCommunications(@Query() query: any) {
    return this.memberManagerService.getAllCommunications(query);
  }

  @Get('communications/:memberId')
  async getMemberCommunications(@Param('memberId') memberId: string) {
    return this.memberManagerService.getMemberCommunications(memberId);
  }

  @Post('communications')
  async logCommunication(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.logCommunication(body, req.user._id);
  }

  // Follow-ups
  @Get('follow-ups')
  async getAllFollowUps(@Query() query: any) {
    return this.memberManagerService.getAllFollowUps(query);
  }

  @Get('follow-ups/member/:memberId')
  async getMemberFollowUps(@Param('memberId') memberId: string) {
    return this.memberManagerService.getMemberFollowUps(memberId);
  }

  @Post('follow-ups')
  async createFollowUp(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createFollowUp(body, req.user._id);
  }

  @Patch('follow-ups/:id')
  async updateFollowUp(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.updateFollowUp(id, body);
  }

  @Patch('follow-ups/:id/complete')
  async completeFollowUp(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.completeFollowUp(id, body);
  }

  // Tickets
  @Get('tickets')
  async getAllTickets(@Query() query: any) {
    return this.memberManagerService.getAllTickets(query);
  }

  @Get('tickets/:id')
  async getTicketById(@Param('id') id: string) {
    return this.memberManagerService.getTicketById(id);
  }

  @Post('tickets')
  async createTicket(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createTicket(body, req.user._id);
  }

  @Patch('tickets/:id')
  async updateTicket(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.updateTicket(id, body);
  }

  @Post('tickets/:ticketId/comments')
  async addTicketComment(@Param('ticketId') ticketId: string, @Body() body: any, @Req() req: any) {
    return this.memberManagerService.addTicketComment(ticketId, body, req.user._id);
  }

  // Subscriptions
  @Post('subscriptions/activate/:userId/:subDate')
  async activateSubscription(@Param('userId') _userId: string, @Param('subDate') _subDate: string) {
    return this.memberManagerService.activateSubscription();
  }

  @Post('subscriptions/activate-lifetime/:userId')
  async activateLifetimeMembership(@Param('userId') userId: string, @Body() body: any) {
    return this.memberManagerService.activateLifetimeMembership(userId, body);
  }

  // Email Templates
  @Get('email-templates')
  async getAllEmailTemplates(@Query() query: any) {
    return this.memberManagerService.getAllEmailTemplates(query);
  }

  @Get('email-templates/:id')
  async getEmailTemplateById(@Param('id') id: string) {
    return this.memberManagerService.getEmailTemplateById(id);
  }

  @Post('email-templates')
  async createEmailTemplate(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createEmailTemplate(body, req.user._id);
  }

  @Patch('email-templates/:id')
  async updateEmailTemplate(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.memberManagerService.updateEmailTemplate(id, body, req.user._id);
  }

  @Delete('email-templates/:id')
  async deleteEmailTemplate(@Param('id') id: string) {
    return this.memberManagerService.deleteEmailTemplate(id);
  }

  // Bulk Email
  @Post('bulk-email')
  async sendBulkEmail(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.sendBulkEmail(body, req.user._id);
  }

  // Tasks
  @Get('tasks')
  async getAllTasks(@Query() query: any) {
    return this.memberManagerService.getAllTasks(query);
  }

  @Get('tasks/:id')
  async getTaskById(@Param('id') id: string) {
    return this.memberManagerService.getTaskById(id);
  }

  @Get('tasks/member/:memberId')
  async getMemberTasks(@Param('memberId') memberId: string) {
    return this.memberManagerService.getMemberTasks(memberId);
  }

  @Post('tasks')
  async createTask(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createTask(body, req.user._id);
  }

  @Patch('tasks/:id')
  async updateTask(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.updateTask(id, body);
  }

  @Patch('tasks/:id/complete')
  async completeTask(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.completeTask(id, body);
  }

  @Delete('tasks/:id')
  async deleteTask(@Param('id') id: string) {
    return this.memberManagerService.deleteTask(id);
  }

  // Analytics & Reports
  @Get('analytics/detailed')
  async getDetailedAnalytics(@Query() query: any) {
    return this.memberManagerService.getDetailedAnalytics(query);
  }

  @Get('analytics/tasks')
  async getTaskAnalytics() {
    return this.memberManagerService.getTaskAnalytics();
  }

  // CSV Export
  @Get('export/members/csv')
  async exportMembersToCSV(@Query() query: any) {
    return this.memberManagerService.exportMembersToCSV(query);
  }

  // Manual Member Creation
  @Post('members/create')
  async createMemberManually(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createMemberManually(body, req.user._id);
  }

  // Ban/Deactivate Member
  @Patch('members/:memberId/ban')
  async banMember(@Param('memberId') memberId: string, @Body() body: any, @Req() req: any) {
    return this.memberManagerService.banMember(memberId, body, req.user._id);
  }

  @Patch('members/:memberId/deactivate')
  async deactivateMember(@Param('memberId') memberId: string, @Body() body: any) {
    return this.memberManagerService.deactivateMember(memberId, body);
  }

  // Member Verification
  @Patch('members/:memberId/verify')
  async verifyMember(@Param('memberId') memberId: string, @Body() body: any, @Req() req: any) {
    return this.memberManagerService.verifyMember(memberId, body, req.user._id);
  }

  @Get('members/pending-verification')
  async getPendingVerifications(@Query() query: any) {
    return this.memberManagerService.getPendingVerifications(query);
  }

  // Content Moderation
  @Get('moderation/reported-content')
  async getReportedContent(@Query() query: any) {
    return this.memberManagerService.getReportedContent(query);
  }

  @Post('moderation/moderate')
  async moderateContent(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.moderateContent(body, req.user._id);
  }

  @Get('moderation/logs')
  async getModerationLogs(@Query() query: any) {
    return this.memberManagerService.getModerationLogs(query);
  }

  // Announcements/Pop-ups
  @Get('announcements')
  async getAllAnnouncements(@Query() query: any) {
    return this.memberManagerService.getAllAnnouncements(query);
  }

  @Get('announcements/:id')
  async getAnnouncementById(@Param('id') id: string) {
    return this.memberManagerService.getAnnouncementById(id);
  }

  @Post('announcements')
  async createAnnouncement(@Body() body: any, @Req() req: any) {
    return this.memberManagerService.createAnnouncement(body, req.user._id);
  }

  @Patch('announcements/:id')
  async updateAnnouncement(@Param('id') id: string, @Body() body: any) {
    return this.memberManagerService.updateAnnouncement(id, body);
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Param('id') id: string) {
    return this.memberManagerService.deleteAnnouncement(id);
  }

  // Financial Reports
  @Get('reports/financial')
  async getFinancialReports(@Query() query: any) {
    return this.memberManagerService.getFinancialReports(query);
  }

  @Get('export/financial/csv')
  async exportFinancialData(@Query() query: any) {
    return this.memberManagerService.exportFinancialData(query);
  }

  // Member Communications
  @Get('communications/chats/:memberId')
  async getMemberChats(@Param('memberId') _memberId: string, @Query() _query: any) {
    return this.memberManagerService.getMemberChats();
  }
}
