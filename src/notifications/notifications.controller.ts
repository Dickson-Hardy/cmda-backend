import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all notifications' })
  async getNotifications(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    return this.notificationService.findAllNotifications(req.user, query);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all notifications counts' })
  async getNotificationStats(@Req() req: { user: IJwtPayload }) {
    return this.notificationService.getNotificationsStats(req.user.id);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }
}
