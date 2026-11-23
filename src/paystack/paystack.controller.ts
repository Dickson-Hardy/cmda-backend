import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EventsService } from '../events/events.service';
import { OrdersService } from '../orders/orders.service';
import { PaystackWebhookDto } from './dto/paystack-webhook.dto';

@Controller('paystack')
export class PaystackController {
  private readonly secret: string;

  constructor(
    private configService: ConfigService,
    private donationsService: DonationsService,
    private subscriptionsService: SubscriptionsService,
    private eventsService: EventsService,
    private ordersService: OrdersService,
  ) {
    this.secret = this.configService.get<string>('PAYSTACK_API_KEY') || '';
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() payload: PaystackWebhookDto,
    @Headers('x-paystack-signature') signature: string, // Extract signature
  ) {
    // Verify the HMAC against the raw request bytes. Re-serialising the parsed
    // body can change whitespace/number formats and break valid signatures.
    const rawBody = req.rawBody;
    if (!rawBody || !signature || !this.secret) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const hash = crypto.createHmac('sha512', this.secret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(hash, 'hex');
    const isValid =
      provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

    if (!isValid) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    try {
      if (payload.event === 'charge.success') {
        const [reference, desc] = [payload.data?.reference, payload.data?.metadata?.desc];
        if (desc === 'DONATION') {
          await this.donationsService.create(undefined, { reference, source: 'PAYSTACK' });
        }
        if (desc === 'SUBSCRIPTION') {
          await this.subscriptionsService.create(undefined, { reference, source: 'PAYSTACK' });
        }
        if (desc === 'EVENT') {
          await this.eventsService.confirmEventPayment({ reference, source: 'PAYSTACK' });
        }
        if (desc === 'ORDER') {
          // Extract user ID from metadata if available, otherwise use null
          const userId = payload.data?.metadata?.userId || null;
          await this.ordersService.create(userId, { reference, source: 'PAYSTACK' });
        }
      }

      return { success: true };
    } catch (error) {
      // Keep deliberate HTTP errors (401/409/...) intact; only unexpected
      // failures become a 500 that asks Paystack to retry.
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Webhook handling failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
