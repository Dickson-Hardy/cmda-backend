import axios from 'axios';
import { PaypalService } from './paypal.service';

describe('PaypalService checkout redirects', () => {
  afterEach(() => jest.restoreAllMocks());

  it('includes return and cancellation URLs in a backend-created order', async () => {
    const service = new PaypalService({
      get: (key: string) =>
        ({
          PAYPAL_CLIENT_ID: 'client-id',
          PAYPAL_CLIENT_SECRET: 'client-secret',
          PAYPAL_API_URL: 'https://api-m.sandbox.paypal.com',
        })[key],
    } as any);

    jest.spyOn(service as any, 'getAccessToken').mockResolvedValue('access-token');
    const post = jest.spyOn(axios, 'post').mockResolvedValue({
      data: { id: 'ORDER-123', status: 'CREATED', links: [] },
    });

    await service.createOrder({
      amount: 10,
      currency: 'USD',
      description: 'DONATION',
      customId: 'INT-DONATION-1',
      requestId: 'INT-DONATION-1',
      items: [{ name: 'General Donation', amount: 10, quantity: 1 }],
      returnUrl:
        'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal',
      cancelUrl:
        'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal&cancelled=true',
    });

    expect(post).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      expect.objectContaining({
        payment_source: {
          paypal: {
            experience_context: expect.objectContaining({
              return_url:
                'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal',
              cancel_url:
                'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal&cancelled=true',
            }),
          },
        },
        purchase_units: [
          expect.objectContaining({
            custom_id: 'INT-DONATION-1',
            amount: expect.objectContaining({ value: '10.00' }),
          }),
        ],
      }),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
          'PayPal-Request-Id': 'INT-DONATION-1',
        }),
      }),
    );
  });

  it('rejects oversized custom IDs before calling PayPal', async () => {
    const service = new PaypalService({ get: jest.fn() } as any);
    const post = jest.spyOn(axios, 'post');

    await expect(
      service.createOrder({
        amount: 10,
        currency: 'USD',
        description: 'DONATION',
        customId: 'x'.repeat(256),
        items: [{ name: 'General Donation', amount: 10, quantity: 1 }],
      }),
    ).rejects.toThrow('PayPal custom ID must be between 1 and 255 characters');
    expect(post).not.toHaveBeenCalled();
  });

  it('rejects item totals that do not match the order amount', async () => {
    const service = new PaypalService({ get: jest.fn() } as any);

    await expect(
      service.createOrder({
        amount: 10,
        currency: 'USD',
        description: 'DONATION',
        customId: 'INT-DONATION-2',
        items: [{ name: 'General Donation', amount: 9, quantity: 1 }],
      }),
    ).rejects.toThrow('PayPal item total does not match the order amount');
  });
});
