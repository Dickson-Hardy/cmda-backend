import { UnauthorizedException } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
} from '../payment-intents/payment-intent.schema';

describe('PaypalController webhook', () => {
  const setup = () => {
    const paypalService = {
      verifyWebhookSignature: jest.fn(),
      getOrderDetails: jest.fn(),
    };
    const donationsService = { create: jest.fn() };
    const subscriptionsService = { create: jest.fn() };
    const ordersService = { create: jest.fn() };
    const eventsService = { confirmEventPayment: jest.fn() };
    const paymentIntentsService = { findByCode: jest.fn() };
    const controller = new PaypalController(
      paypalService as any,
      donationsService as any,
      subscriptionsService as any,
      ordersService as any,
      eventsService as any,
      paymentIntentsService as any,
    );
    return {
      controller,
      paypalService,
      subscriptionsService,
      paymentIntentsService,
    };
  };

  it('rejects an unverified webhook before reading payment data', async () => {
    const { controller, paypalService } = setup();
    paypalService.verifyWebhookSignature.mockResolvedValue(false);

    await expect(controller.handleWebhook({}, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(paypalService.getOrderDetails).not.toHaveBeenCalled();
  });

  it('routes a completed capture through its server-owned payment intent', async () => {
    const { controller, paypalService, subscriptionsService, paymentIntentsService } = setup();
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    paypalService.getOrderDetails.mockResolvedValue({
      purchase_units: [{ payments: { captures: [{ custom_id: 'INT-SUB-1' }] } }],
    });
    paymentIntentsService.findByCode.mockResolvedValue({
      provider: PaymentIntentProvider.PAYPAL,
      context: PaymentIntentContext.SUBSCRIPTION,
      providerReference: 'PAYPAL-ORDER-1',
    });

    await expect(
      controller.handleWebhook(
        {
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-1' } } },
        },
        {},
      ),
    ).resolves.toEqual({ success: true });
    expect(subscriptionsService.create).toHaveBeenCalledWith(undefined, {
      reference: 'PAYPAL-ORDER-1',
      source: 'PAYPAL',
    });
  });
});
