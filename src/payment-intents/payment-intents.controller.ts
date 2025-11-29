import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PaymentIntentsService } from './payment-intents.service';
import { LookupPaymentIntentDto } from './dto/lookup-payment-intent.dto';
import { RequeryPaymentIntentDto } from './dto/requery-payment-intent.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllUserRoles } from '../users/user.constant';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PaystackService } from '../paystack/paystack.service';
import {
  PaymentIntent,
  PaymentIntentContext,
  PaymentIntentProvider,
} from './payment-intent.schema';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { OrdersService } from '../orders/orders.service';

@ApiTags('Payment Intents')
@Controller('payment-intents')
export class PaymentIntentsController {
  constructor(
    private paymentIntentsService: PaymentIntentsService,
    private paystackService: PaystackService,
    private donationsService: DonationsService,
    private subscriptionsService: SubscriptionsService,
    private ordersService: OrdersService,
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
  @Public()
  @ApiOperation({ summary: 'Find payment intents by email address' })
  async lookupByEmail(@Body() body: LookupPaymentIntentDto) {
    const result = await this.paymentIntentsService.lookupByEmail(body);
    return {
      success: true,
      message: 'Payment intents fetched successfully',
      data: result,
    };
  }

  @Post('requery')
  @Public()
  @ApiOperation({ summary: 'Requery payment intents and sync their downstream payloads' })
  async requery(@Body() body: RequeryPaymentIntentDto) {
    const intents = await this.resolveIntentsForRequery(body);

    if (!intents.length) {
      return {
        success: false,
        message: 'No payment intents matched the supplied criteria',
        data: [],
      };
    }

    const outcomes = [];
    for (const intent of intents) {
      if (intent.provider !== PaymentIntentProvider.PAYSTACK) {
        outcomes.push({
          intentId: intent.id,
          intentCode: intent.intentCode,
          status: intent.status,
          error: 'Only Paystack transactions can be re-queried via this endpoint for now',
        });
        continue;
      }

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

  private async resolveIntentsForRequery(body: RequeryPaymentIntentDto): Promise<PaymentIntent[]> {
    if (body.intentId) {
      const intent = await this.paymentIntentsService.findById(body.intentId);
      return intent ? [intent] : [];
    }

    if (body.reference) {
      const intent = await this.paymentIntentsService.findByReference(body.reference);
      return intent ? [intent] : [];
    }

    if (body.email) {
      const result = await this.paymentIntentsService.lookupByEmail({ email: body.email });
      return result.items;
    }

    return [];
  }

  private async dispatchContextSync(intent: PaymentIntent, reference: string) {
    if (!intent.user) {
      return;
    }
    const userId = intent.user.toString();

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
