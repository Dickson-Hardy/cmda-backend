import { Controller, Post, Body, Param, Get, BadRequestException } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { AllAdminRoles } from '../admin/admin.constant';
// import { IPaypalCreateOrder } from './paypal.interface';
// import { CreateOrderDto } from './paypal.dto';

@ApiTags('Paypal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paypal create order' })
  // @ApiBody({ type: CreateOrderDto })
  async createOrder(@Body('amount') amount: string | number) {
    return await this.paypalService._createOrder(String(amount));
  }

  @Post('capture-order/:orderId')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Paypal capture order' })
  async captureOrder(@Param('orderId') orderId: string) {
    if (!orderId || orderId === 'null' || orderId === 'undefined') {
      throw new BadRequestException('Invalid order ID provided');
    }
    return await this.paypalService.captureOrder(orderId);
  }

  @Get('order/:orderId')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paypal order details' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    if (!orderId || orderId === 'null' || orderId === 'undefined') {
      throw new BadRequestException('Invalid order ID provided');
    }
    const order = await this.paypalService.getOrderDetails(orderId);
    return order ? { id: order.id, status: order.status } : null;
  }
}
