import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { AllAdminRoles } from '../admin/admin.constant';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OrdersService } from '../orders/orders.service';
import { EventsService } from '../events/events.service';
import { PaymentIntentsService } from '../payment-intents/payment-intents.service';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
} from '../payment-intents/payment-intent.schema';
// import { IPaypalCreateOrder } from './paypal.interface';
// import { CreateOrderDto } from './paypal.dto';

@ApiTags('Paypal')
@Controller('paypal')
export class PaypalController {
  constructor(
    private readonly paypalService: PaypalService,
    private readonly donationsService: DonationsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly ordersService: OrdersService,
    private readonly eventsService: EventsService,
    private readonly paymentIntentsService: PaymentIntentsService,
  ) {}

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Receive verified PayPal payment events' })
  async handleWebhook(
    @Body() payload: any,
    @Headers() headers: Record<string, string | undefined>,
  ) {
    const verified = await this.paypalService.verifyWebhookSignature(headers, payload);
    if (!verified) throw new UnauthorizedException('Invalid PayPal webhook signature');

    if (payload?.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      return { success: true };
    }

    const orderId = payload?.resource?.supplementary_data?.related_ids?.order_id;
    if (!orderId) throw new BadRequestException('PayPal webhook order ID is missing');

    const order = await this.paypalService.getOrderDetails(orderId);
    const capture = order.purchase_units?.[0]?.payments?.captures?.[0];
    const customId = capture?.custom_id || order.purchase_units?.[0]?.custom_id;
    const intent = customId?.startsWith('INT-')
      ? await this.paymentIntentsService.findByCode(customId)
      : null;
    if (!intent || intent.provider !== PaymentIntentProvider.PAYPAL) {
      throw new BadRequestException('PayPal payment intent was not found');
    }
    if (intent.providerReference && intent.providerReference !== orderId) {
      throw new BadRequestException('PayPal order does not match its payment intent');
    }

    try {
      if (intent.context === PaymentIntentContext.DONATION) {
        await this.donationsService.create(undefined, { reference: orderId, source: 'PAYPAL' });
      } else if (intent.context === PaymentIntentContext.SUBSCRIPTION) {
        await this.subscriptionsService.create(undefined, {
          reference: orderId,
          source: 'PAYPAL',
        });
      } else if (intent.context === PaymentIntentContext.ORDER) {
        await this.ordersService.create(undefined, { reference: orderId, source: 'PAYPAL' });
      } else if (intent.context === PaymentIntentContext.EVENT) {
        await this.eventsService.confirmEventPayment({ reference: orderId, source: 'PAYPAL' });
      }
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
    }

    return { success: true };
  }

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
