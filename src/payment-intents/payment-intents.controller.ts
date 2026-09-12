import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PaymentIntentsService } from './payment-intents.service';
import { LookupPaymentIntentDto } from './dto/lookup-payment-intent.dto';
import { RequeryPaymentIntentDto } from './dto/requery-payment-intent.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { PaystackService } from '../paystack/paystack.service';
import {
  PaymentIntent,
  PaymentIntentContext,
  PaymentIntentProvider,
} from './payment-intent.schema';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OrdersService } from '../orders/orders.service';
import { PaypalService } from '../paypal/paypal.service';
import { EventsService } from '../events/events.service';

@ApiTags('Payment Intents')
@Controller('payment-intents')
export class PaymentIntentsController {
  constructor(
    private paymentIntentsService: PaymentIntentsService,
    private paystackService: PaystackService,
    private donationsService: DonationsService,
    private subscriptionsService: SubscriptionsService,
    private ordersService: OrdersService,
    private paypalService: PaypalService,
    private eventsService: EventsService,
  ) {}

  @Get('me')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch payment intents created by the authenticated user' })
  async findMyIntents(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    const result = await this.paymentIntentsService.listForUser(req.user.id, query);
    return {
      success: true,
      message: 'Payment intents fetched successfully',
      data: result,
    };
  }

  @Post('lookup-email')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Find payment intents belonging to the authenticated user' })
  async lookupByEmail(@Req() req: { user: IJwtPayload }, @Body() body: LookupPaymentIntentDto) {
    const result = await this.paymentIntentsService.lookupForUser(req.user.id, body);
    return {
      success: true,
      message: 'Payment intents fetched successfully',
      data: result,
    };
  }

  @Post('requery')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Requery payment intents and sync their downstream payloads' })
  async requery(@Req() req: { user: IJwtPayload }, @Body() body: RequeryPaymentIntentDto) {
    const intents = await this.resolveIntentsForRequery(req.user.id, body);

    if (!intents.length) {
      return {
        success: false,
        message: 'No payment intents matched the supplied criteria',
        data: [],
      };
    }

    const outcomes = [];
    for (const intent of intents) {
      const reference = intent.providerReference || body.reference;
      if (!reference) {
        outcomes.push({
          intentId: intent.id,
          intentCode: intent.intentCode,
          status: intent.status,
          error: 'No transaction reference available for this intent',
        });
        continue;
      }

      try {
        if (intent.provider === PaymentIntentProvider.PAYPAL) {
          const verification = await this.paypalService.captureOrGetCompletedOrder(reference);
          const providerStatus = verification?.status;
          if (providerStatus === 'COMPLETED') {
            await this.dispatchContextSync(intent, reference);
            await this.paymentIntentsService.markAsSuccessful(intent.id, verification);
          }
          outcomes.push({
            intentId: intent.id,
            intentCode: intent.intentCode,
            reference,
            providerStatus,
          });
        } else {
          const verification = await this.paystackService.verifyTransaction(reference);
          const providerStatus = verification?.data?.status;
          if (verification.status && providerStatus === 'success') {
            await this.paymentIntentsService.markAsSuccessful(intent.id, verification.data);
            await this.dispatchContextSync(intent, reference);
          }
          outcomes.push({
            intentId: intent.id,
            intentCode: intent.intentCode,
            reference,
            providerStatus,
          });
        }
      } catch (error) {
        outcomes.push({
          intentId: intent.id,
          intentCode: intent.intentCode,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: 'Requery operation completed',
      data: outcomes,
    };
  }

  private async resolveIntentsForRequery(
    userId: string,
    body: RequeryPaymentIntentDto,
  ): Promise<PaymentIntent[]> {
    if (body.intentId) {
      const intent = await this.paymentIntentsService.findOwnedById(body.intentId, userId);
      return intent ? [intent] : [];
    }

    if (body.reference) {
      const intent = await this.paymentIntentsService.findOwnedByReference(body.reference, userId);
      return intent ? [intent] : [];
    }

    if (body.email) {
      const result = await this.paymentIntentsService.lookupForUser(userId, { email: body.email });
      return result.items;
    }

    return [];
  }

  private async dispatchContextSync(intent: PaymentIntent, reference: string) {
    if (!intent.user) {
      return;
    }
    const userId = intent.user.toString();

    if (intent.provider === PaymentIntentProvider.PAYPAL) {
      switch (intent.context) {
        case PaymentIntentContext.DONATION:
          await this.donationsService.create(userId, { reference, source: 'PAYPAL' });
          return;
        case PaymentIntentContext.SUBSCRIPTION:
          await this.subscriptionsService.create(userId, { reference, source: 'PAYPAL' });
          return;
        case PaymentIntentContext.ORDER:
          await this.ordersService.create(userId, { reference, source: 'PAYPAL' });
          return;
        case PaymentIntentContext.EVENT:
          await this.eventsService.confirmEventPayment({ reference, source: 'PAYPAL' }, userId);
          return;
      }
    }

    switch (intent.context) {
      case PaymentIntentContext.DONATION:
        await this.donationsService.syncPaymentStatus(userId, reference);
        break;
      case PaymentIntentContext.SUBSCRIPTION:
        await this.subscriptionsService.syncPaymentStatus(userId, reference);
        break;
      case PaymentIntentContext.ORDER:
        await this.ordersService.syncPaymentStatus(userId, reference);
        break;
      default:
        break;
    }
  }
}
