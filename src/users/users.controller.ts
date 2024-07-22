import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { ExportUsersDto } from './dto/export-user.dto';
import { AllUserRoles, TransitionStatus } from './user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';
import { CreateUserTransitionDto } from './dto/create-transition.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetches all members' })
  findAll(@Query() query: UserPaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Downloads all members data as csv' })
  exportAll(@Query() query: ExportUsersDto) {
    return this.usersService.exportAll(query);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total members for each role - student, doctor, global' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get('transition')
  @ApiBearerAuth()
  @Roles(AllUserRoles)
  @ApiOperation({ summary: 'Returns user transition information' })
  getTransition(@Req() req: { user: IJwtPayload }) {
    return this.usersService.getTransition(req.user.id);
  }

  @Post('transition')
  @ApiBearerAuth()
  @Roles(AllUserRoles)
  @ApiOperation({ summary: 'Updates or creates a user transition' })
  @ApiBody({ type: CreateUserTransitionDto })
  createTransition(
    @Req() req: { user: IJwtPayload },
    @Body() createUserTransitionDto: CreateUserTransitionDto,
  ) {
    return this.usersService.createTransition(req.user.id, createUserTransitionDto);
  }

  @Get('transition/all')
  @ApiBearerAuth()
  @Roles(AllAdminRoles)
  @ApiOperation({ summary: 'Returns all users transitions' })
  getAllTransitions() {
    return this.usersService.getAllTransitions();
  }

  @Post('transition/:id/:status')
  @ApiBearerAuth()
  @Roles(AllAdminRoles)
  @ApiOperation({ summary: 'Updates status of a transition --- Admin' })
  updateTransitionStatus(@Param('id') id: string, @Param('status') status: TransitionStatus) {
    return this.usersService.updateTransitionStatus(id, status);
  }

  @Get('settings')
  @ApiBearerAuth()
  @Roles(AllUserRoles)
  @ApiOperation({ summary: 'Returns user settings' })
  getSettings(@Req() req: { user: IJwtPayload }) {
    return this.usersService.getSettings(req.user.id);
  }

  @Patch('settings')
  @ApiBearerAuth()
  @Roles(AllUserRoles)
  @ApiOperation({ summary: 'Updates user settings' })
  @ApiBody({ type: UpdateUserSettingsDto })
  updateSettings(
    @Req() req: { user: IJwtPayload },
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(req.user.id, updateUserSettingsDto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by id or membershipId' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Delete(':membershipId')
  @ApiBearerAuth()
  @Roles(AllAdminRoles)
  @ApiOperation({ summary: 'Delete a user by membershipId' })
  remove(@Param('membershipId') membershipId: string) {
    return this.usersService.remove(membershipId);
  }
}
