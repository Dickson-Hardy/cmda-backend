import { Controller, Get, Param, Req } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllUserRoles } from '../users/user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Chats')
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('contacts')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's chat contacts" })
  findAllContacts(@Req() req: { user: IJwtPayload }) {
    return this.chatsService.findAllContacts(req.user.id);
  }

  @Get('history/:id')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch previouss chats between current user and user with param id' })
  getChatHistory(@Req() req: { user: IJwtPayload }, @Param('id') chatWith: string) {
    return this.chatsService.getChatHistory(req.user.id, chatWith);
  }
}
