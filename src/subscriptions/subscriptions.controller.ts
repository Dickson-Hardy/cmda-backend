import { Controller, Get, Post, Body, Req, Query, Param } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AllUserRoles } from '../users/user.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { SubscriptionPaginationQueryDto } from './dto/subscription-pagination.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all subscription records -- Admin' })
  findAll(@Query() query: SubscriptionPaginationQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exports all subscription records' })
  exportAll(@Query() query: SubscriptionPaginationQueryDto) {
    return this.subscriptionsService.exportAll(query);
  }

  @Get('history')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's subscription history" })
  findUserSubs(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    return this.subscriptionsService.findUserSubs(req.user.id, query);
  }

  @Post('pay')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'init a subscription payment session' })
  init(@Req() req: { user: IJwtPayload }) {
    return this.subscriptionsService.init(req.user.id);
  }

  @Post('save')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  create(@Req() req: { user: IJwtPayload }, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(req.user.id, createSubscriptionDto);
  }

  @Post('activate/:userId/:subDate')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  activate(@Param('userId') userId: string, @Param('subDate') subDate: string) {
    return this.subscriptionsService.activate(userId, subDate);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for subscriptions' })
  getStats() {
    return this.subscriptionsService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subscription by id' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }
}
