import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';

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

  @Get(':membershipId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a user by membershipId' })
  findOne(@Param('membershipId') membershipId: string) {
    return this.usersService.findOne(membershipId);
  }

  @Delete(':membershipId')
  @ApiBearerAuth()
  @Roles(AllAdminRoles)
  @ApiOperation({ summary: 'Delete a user by membershipId' })
  remove(@Param('membershipId') membershipId: string) {
    return this.usersService.remove(membershipId);
  }
}
