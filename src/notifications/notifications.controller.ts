import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { PushTokenService } from './push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly pushTokenService: PushTokenService,
  ) {}

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
    return this.notificationService.getNotificationsStats(req.user);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user.id, id);
  }

  @Post('push-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or update push token for device' })
  @ApiBody({ type: RegisterPushTokenDto })
  async registerPushToken(
    @Req() req: { user: IJwtPayload },
    @Body() dto: RegisterPushTokenDto,
  ) {
    return this.pushTokenService.registerToken(req.user.id, dto);
  }

  @Delete('push-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push token on logout' })
  async removePushToken(
    @Req() req: { user: IJwtPayload },
    @Query('deviceId') deviceId: string,
  ) {
    return this.pushTokenService.removeToken(req.user.id, deviceId);
  }
}
