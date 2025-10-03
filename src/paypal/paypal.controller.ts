import { Controller, Post, Body, Param, Get } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { Public } from '../auth/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
// import { IPaypalCreateOrder } from './paypal.interface';
// import { CreateOrderDto } from './paypal.dto';

@ApiTags('Paypal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  @Public()
  @ApiOperation({ summary: 'Paypal create order' })
  // @ApiBody({ type: CreateOrderDto })
  async createOrder(@Body('amount') amount: string | number) {
    return await this.paypalService._createOrder(String(amount));
  }

  @Post('capture-order/:orderId')
  @Public()
  @ApiOperation({ summary: 'Paypal capture order' })
  async captureOrder(@Param('orderId') orderId: string) {
    return await this.paypalService.captureOrder(orderId);
  }

  @Get('order/:orderId')
  @Public()
  @ApiOperation({ summary: 'Get paypal order details' })
  async getOrderDetails(@Param('orderId') orderId: string) {
    return await this.paypalService.getOrderDetails(orderId);
  }
}
