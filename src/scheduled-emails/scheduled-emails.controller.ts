import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';
import { ScheduledEmailsService } from './scheduled-emails.service';

@Controller('scheduled-emails')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScheduledEmailsController {
  constructor(private readonly scheduledEmailsService: ScheduledEmailsService) {}

  /**
   * Manual trigger endpoints for admin testing
   * These should only be accessible by admins
   */

  @Post('trigger/birthday')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER, AdminRole.FINANCE_MANAGER])
  async triggerBirthdayEmails() {
    await this.scheduledEmailsService.triggerBirthdayEmails();
    return {
      success: true,
      message: 'Birthday emails triggered successfully',
    };
  }

  @Post('trigger/subscription-reminders')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER, AdminRole.FINANCE_MANAGER])
  async triggerSubscriptionReminders() {
    await this.scheduledEmailsService.triggerSubscriptionReminders();
    return {
      success: true,
      message: 'Subscription reminder emails triggered successfully',
    };
  }

  @Post('trigger/event-reminders')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER, AdminRole.FINANCE_MANAGER])
  async triggerEventReminders() {
    await this.scheduledEmailsService.triggerEventReminders();
    return {
      success: true,
      message: 'Event reminder emails triggered successfully',
    };
  }

  @Post('trigger/followup')
  @Roles([AdminRole.SUPERADMIN, AdminRole.MEMBER_MANAGER, AdminRole.FINANCE_MANAGER])
  async triggerFollowUpEmails() {
    await this.scheduledEmailsService.triggerFollowUpEmails();
    return {
      success: true,
      message: 'Follow-up emails triggered successfully',
    };
  }
}
