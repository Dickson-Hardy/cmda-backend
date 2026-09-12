import { EventsController } from './events.controller';

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
});
