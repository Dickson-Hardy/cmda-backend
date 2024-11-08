import { Controller, Get, Post, Body, Req, Query, Patch, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { AllAdminRoles } from '../admin/admin.constant';
import { InitOrderDto } from './dto/init-order-dto';
import { UpdateOrderDto } from './dto/update-order.dto';

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

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for each order status' })
  getStats() {
    return this.ordersService.getStats();
  }

  @Patch('update-status/:id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the status of an order' })
  @ApiBody({ type: UpdateOrderDto })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Post('pay')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Init an order payment session' })
  @ApiBody({ type: InitOrderDto })
  init(@Req() req: { user: IJwtPayload }, @Body() initOrderDto: InitOrderDto) {
    return this.ordersService.init(req.user.id, initOrderDto);
  }

  @Post('create')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'creates order after successful payment session' })
  @ApiBody({ type: CreateOrderDto })
  create(@Req() req: { user: IJwtPayload }, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an order by id' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
