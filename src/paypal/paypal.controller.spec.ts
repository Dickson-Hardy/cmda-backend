import { UnauthorizedException } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
  PaymentIntentStatus,
} from '../payment-intents/payment-intent.schema';

describe('PaypalController webhook', () => {
  const setup = () => {
    const paypalService = {
      verifyWebhookSignature: jest.fn(),
      getOrderDetails: jest.fn(),
      captureOrGetCompletedOrder: jest.fn(),
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
      status: 'COMPLETED',
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

  it('captures and records an approved order when the member does not return', async () => {
    const { controller, paypalService, subscriptionsService, paymentIntentsService } = setup();
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    paypalService.captureOrGetCompletedOrder.mockResolvedValue({
      id: 'PAYPAL-ORDER-2',
      status: 'COMPLETED',
      purchase_units: [{ custom_id: 'INT-SUB-2' }],
    });
    paymentIntentsService.findByCode.mockResolvedValue({
      provider: PaymentIntentProvider.PAYPAL,
      context: PaymentIntentContext.SUBSCRIPTION,
      providerReference: 'PAYPAL-ORDER-2',
      status: PaymentIntentStatus.PROCESSING,
    });

    await expect(
      controller.handleWebhook(
        {
          event_type: 'CHECKOUT.ORDER.APPROVED',
          resource: { id: 'PAYPAL-ORDER-2' },
        },
        {},
      ),
    ).resolves.toEqual({ success: true });

    expect(paypalService.captureOrGetCompletedOrder).toHaveBeenCalledWith('PAYPAL-ORDER-2');
    expect(subscriptionsService.create).toHaveBeenCalledWith(undefined, {
      reference: 'PAYPAL-ORDER-2',
      source: 'PAYPAL',
    });
  });

  it('does not record an already successful PayPal intent twice', async () => {
    const { controller, paypalService, subscriptionsService, paymentIntentsService } = setup();
    paypalService.verifyWebhookSignature.mockResolvedValue(true);
    paypalService.getOrderDetails.mockResolvedValue({
      status: 'COMPLETED',
      purchase_units: [{ custom_id: 'INT-SUB-3' }],
    });
    paymentIntentsService.findByCode.mockResolvedValue({
      provider: PaymentIntentProvider.PAYPAL,
      context: PaymentIntentContext.SUBSCRIPTION,
      providerReference: 'PAYPAL-ORDER-3',
      status: PaymentIntentStatus.SUCCESSFUL,
    });

    await expect(
      controller.handleWebhook(
        {
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: { supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-3' } } },
        },
        {},
      ),
    ).resolves.toEqual({ success: true });

    expect(subscriptionsService.create).not.toHaveBeenCalled();
  });
});
