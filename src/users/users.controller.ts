import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Fetches all members' })
  findAll(@Query() query: UserPaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':membershipId')
  @ApiOperation({ summary: 'Get a user by membershipId' })
  findOne(@Param('membershipId') membershipId: string) {
    return this.usersService.findOne(membershipId);
  }

  @Delete(':membershipId')
  @ApiOperation({ summary: 'Delete a user by membershipId' })
  remove(@Param('membershipId') membershipId: string) {
    return this.usersService.remove(membershipId);
  }
}
