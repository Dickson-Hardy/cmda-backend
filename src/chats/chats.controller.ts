import { Controller, Get, Param, Req } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  getChatHistory(@Req() req: { user: IJwtPayload }, @Param('id') chatWith: string) {
    return this.chatsService.getChatHistory(req.user, chatWith);
  }
}
