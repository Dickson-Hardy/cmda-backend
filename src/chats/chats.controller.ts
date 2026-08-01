import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ChatGateway } from './chat.gateway';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatHistoryQueryDto } from './dto/chat-history-query.dto';
import { Throttle } from '@nestjs/throttler';
import { BroadcastMessageDto } from './dto/broadcast-message.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { ParseObjectIdPipe } from '../_global/pipes/parse-object-id.pipe';
import { ReportMessageDto } from './dto/report-message.dto';

@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chatsService: ChatsService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('contacts')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's chat contacts" })
  findAllContacts(@Req() req: { user: IJwtPayload }) {
    return this.chatsService.findAllContacts(req.user);
  }

  @Get('history/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch previous chats between current user and user with param id' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default: 50)' })
  getChatHistory(
    @Req() req: { user: IJwtPayload },
    @Param('id') chatWith: string,
    @Query() query: ChatHistoryQueryDto,
  ) {
    return this.chatsService.getChatHistory(req.user, chatWith, query.page, query.limit);
  }

  @Post('messages')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a chat message' })
  async sendMessage(
    @Req() req: { user: IJwtPayload },
    @Body() body: SendMessageDto,
  ) {
    const message = await this.chatGateway.sendMessage({
      sender: AllAdminRoles.includes(req.user.role as any) ? 'admin' : req.user.id,
      receiver: body.receiver.trim(),
      content: body.content.trim(),
      clientMessageId: body.clientMessageId,
    });

    return {
      success: true,
      message: 'Message sent successfully',
      data: message,
    };
  }

  @Get('blocks')
  @ApiBearerAuth()
  getBlockedUsers(@Req() req: { user: IJwtPayload }) {
    return this.chatsService.getBlockedUsers(req.user);
  }

  @Post('blocks/:id')
  @ApiBearerAuth()
  blockUser(
    @Req() req: { user: IJwtPayload },
    @Param('id', ParseObjectIdPipe) targetId: string,
  ) {
    return this.chatsService.blockUser(req.user, targetId);
  }

  @Delete('blocks/:id')
  @ApiBearerAuth()
  unblockUser(
    @Req() req: { user: IJwtPayload },
    @Param('id', ParseObjectIdPipe) targetId: string,
  ) {
    return this.chatsService.unblockUser(req.user, targetId);
  }

  @Post('messages/:id/report')
  @ApiBearerAuth()
  reportMessage(
    @Req() req: { user: IJwtPayload },
    @Param('id', ParseObjectIdPipe) messageId: string,
    @Body() body: ReportMessageDto,
  ) {
    return this.chatsService.reportMessage(req.user, messageId, body.reason.trim());
  }

  @Post('broadcast')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a message to members matching admin criteria' })
  async broadcastMessage(@Body() body: BroadcastMessageDto) {
    const result = await this.chatGateway.broadcastMessage(body);
    return {
      success: true,
      message: 'Broadcast message sent successfully',
      data: result,
    };
  }
}
