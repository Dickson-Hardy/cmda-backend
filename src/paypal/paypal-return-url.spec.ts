import axios from 'axios';
import { PaypalService } from './paypal.service';

describe('PaypalService checkout redirects', () => {
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
      metadata: JSON.stringify({ donationId: 'donation-id' }),
      items: [{ name: 'General Donation', amount: 10, quantity: 1 }],
      returnUrl:
        'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal',
      cancelUrl:
        'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal&cancelled=true',
    });

    expect(post).toHaveBeenCalledWith(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      expect.objectContaining({
        application_context: expect.objectContaining({
          return_url:
            'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal',
          cancel_url:
            'https://cmdanigeria.net/dashboard/payments/successful?type=donation&source=paypal&cancelled=true',
        }),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    );
  });
});
