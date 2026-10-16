import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
} from '../payment-intents/payment-intent.schema';

describe('EventsController payment ownership', () => {
  it('passes the authenticated member to payment confirmation', async () => {
    const eventsService = {
      confirmEventPayment: jest.fn().mockResolvedValue({ success: true }),
    };
    const controller = new EventsController(eventsService as any);
    const payment = { reference: 'PAYPAL-ORDER-1', source: 'PAYPAL' };

    await controller.confirmEventPayment(payment, { user: { id: 'member-1' } } as any);

    expect(eventsService.confirmEventPayment).toHaveBeenCalledWith(payment, 'member-1');
  });

  it('rejects a completed PayPal order owned by another member', async () => {
    const paypalService = {
      captureOrGetCompletedOrder: jest.fn().mockResolvedValue({
        status: 'COMPLETED',
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  custom_id: 'INT-EVENT-1',
                  amount: { value: '20.00', currency_code: 'USD' },
                },
              ],
            },
          },
        ],
      }),
    };
    const paymentIntentsService = {
      findByCode: jest.fn().mockResolvedValue({
        provider: PaymentIntentProvider.PAYPAL,
        context: PaymentIntentContext.EVENT,
        user: { toString: () => 'member-2' },
        amount: 20,
        currency: 'USD',
        contextData: { userId: 'member-2', slug: 'conference' },
      }),
    };
    const service = new EventsService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      paypalService as any,
      {} as any,
      {} as any,
      {} as any,
      paymentIntentsService as any,
    );

    await expect(
      service.confirmEventPayment({ reference: 'PAYPAL-ORDER-1', source: 'PAYPAL' }, 'member-1'),
    ).rejects.toThrow('This payment does not belong to your event registration');
  });
});
