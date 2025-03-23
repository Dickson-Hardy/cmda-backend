import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EventsService } from '../events/events.service';

@Controller('paystack')
export class PaystackController {
  private readonly secret: string;

  constructor(
    private configService: ConfigService,
    private donationsService: DonationsService,
    private subscriptionsService: SubscriptionsService,
    private eventsService: EventsService,
  ) {
    this.secret = this.configService.get<string>('PAYSTACK_API_KEY') || '';
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Body() payload: any, // Extract request body
    @Headers('x-paystack-signature') signature: string, // Extract signature
  ) {
    try {
      const hash = crypto
        .createHmac('sha512', this.secret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (hash !== signature) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      console.log('🔔 Paystack Webhook Received:', payload.event);

      if (payload.event === 'charge.success') {
        const [reference, desc] = [payload.data.reference, payload.data.metadata.desc];
        console.log('✅ Payment Successful:', { reference, desc });
        if (desc === 'DONATION') {
          await this.donationsService.create({ reference, source: 'PAYSTACK' });
        }
        if (desc === 'SUBSCRIPTION') {
          await this.subscriptionsService.create({ reference, source: 'PAYSTACK' });
        }
        if (desc === 'EVENT') {
          await this.eventsService.confirmEventPayment({ reference, source: 'PAYSTACK' });
        }

        // TODO: orders
      }

      return { success: true };
    } catch (error) {
      throw new HttpException(
        error.message || 'Webhook handling failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
