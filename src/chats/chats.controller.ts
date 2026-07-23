import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';

@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

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
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatsService.getChatHistory(req.user, chatWith, page || 1, limit || 50);
  }
}
