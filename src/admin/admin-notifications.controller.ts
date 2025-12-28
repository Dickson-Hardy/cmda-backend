import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from './admin.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AdminNotificationService } from '../notifications/admin-notification.service';
import { CreateAdminNotificationDto } from '../notifications/dto/create-admin-notification.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

@ApiTags('Admin Notifications')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationService: AdminNotificationService,
  ) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a push notification to targeted users' })
  @ApiBody({ type: CreateAdminNotificationDto })
  async sendNotification(
    @Req() req: { user: IJwtPayload },
    @Body() dto: CreateAdminNotificationDto,
  ) {
    return this.adminNotificationService.createNotification(req.user.id, dto);
  }

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification history with pagination' })
  async getHistory(@Query() query: PaginationQueryDto) {
    return this.adminNotificationService.getHistory(query);
  }

  @Get(':id/stats')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get delivery stats for a specific notification' })
  async getStats(@Param('id') id: string) {
    return this.adminNotificationService.getStats(id);
  }
}
