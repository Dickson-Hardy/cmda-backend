import { Controller, Get, Post, Body, Req, Query } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { AllAdminRoles } from '../admin/admin.constant';
import { InitOrderDto } from './dto/init-order-dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all orders -- Admin' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('history')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's order history" })
  getOrderHistory(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    return this.ordersService.getOrderHistory(req.user.id, query);
  }

  @Post('pay')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Init an order payment session' })
  @ApiBody({ type: InitOrderDto })
  init(@Body() initOrderDto: InitOrderDto) {
    return this.ordersService.init(initOrderDto);
  }

  @Post('create')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'creates order after successful payment session' })
  @ApiBody({ type: CreateOrderDto })
  create(@Req() req: { user: IJwtPayload }, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }
}
