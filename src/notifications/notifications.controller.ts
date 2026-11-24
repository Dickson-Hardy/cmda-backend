import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { NotificationsService } from './notifications.service';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { PushTokenService } from './push-token.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { Public } from '../auth/decorators/public.decorator';
import { WebPushService } from './web-push.service';
import { RegisterWebPushDto } from './dto/register-web-push.dto';
import { RemoveWebPushDto } from './dto/remove-web-push.dto';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationService: NotificationsService,
    private readonly pushTokenService: PushTokenService,
    private readonly webPushService: WebPushService,
  ) {}

  @Public()
  @Get('push-vapid-public-key')
  @ApiOperation({ summary: 'Get the public VAPID key used to create browser push subscriptions' })
  getPushVapidPublicKey() {
    return {
      success: true,
      message: 'VAPID public key fetched',
      data: { publicKey: this.webPushService.getPublicKey() },
    };
  }

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

  @Get('unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: { user: IJwtPayload }) {
    return this.notificationService.getUnreadCount(req.user);
  }

  @Patch('mark-all-read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: { user: IJwtPayload }) {
    return this.notificationService.markAllAsRead(req.user);
  }

  @Post('push-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register or update push token for device' })
  @ApiBody({ type: RegisterPushTokenDto })
  async registerPushToken(@Req() req: { user: IJwtPayload }, @Body() dto: RegisterPushTokenDto) {
    return this.pushTokenService.registerToken(req.user.id, dto);
  }

  @Delete('push-token')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push token on logout' })
  async removePushToken(@Req() req: { user: IJwtPayload }, @Query('deviceId') deviceId: string) {
    return this.pushTokenService.removeToken(req.user.id, deviceId);
  }

  @Post('push-subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a browser Web Push subscription' })
  @ApiBody({ type: RegisterWebPushDto })
  async subscribeToWebPush(
    @Req() req: { user: IJwtPayload },
    @Body() dto: RegisterWebPushDto,
  ) {
    return this.webPushService.subscribe(req.user.id, dto);
  }

  @Delete('push-subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a browser Web Push subscription' })
  @ApiBody({ type: RemoveWebPushDto })
  async unsubscribeFromWebPush(
    @Req() req: { user: IJwtPayload },
    @Body() dto: RemoveWebPushDto,
  ) {
    return this.webPushService.unsubscribe(req.user.id, dto.endpoint);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch one notification' })
  async getNotification(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.findOneNotification(req.user, id);
  }

  @Patch(':id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.markAsRead(req.user, id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.deleteNotification(req.user, id);
  }

  @Patch(':id/restore')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a recently deleted notification' })
  async restoreNotification(@Req() req: { user: IJwtPayload }, @Param('id') id: string) {
    return this.notificationService.restoreNotification(req.user, id);
  }
}
