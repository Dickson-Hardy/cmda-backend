import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService UK/Europe payments', () => {
  const user = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    role: 'GlobalNetwork',
    region: 'UK/Europe region',
    membershipId: 'GN-UK-001',
    fullName: 'UK Member',
    email: 'member@example.com',
  };

  const createService = (paidAmounts: number[] = []) => {
    const userModel = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const subscriptionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(paidAmounts.map((amount) => ({ amount }))),
        }),
      }),
    };
    const paypalService = {
      createOrder: jest.fn().mockResolvedValue({ id: 'PAYPAL-ORDER' }),
    };
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    return {
      service: new SubscriptionsService(
        userModel as any,
        subscriptionModel as any,
        {} as any,
        paypalService as any,
        configService as any,
        {} as any,
        {} as any,
      ),
      paypalService,
    };
  };

  it('creates a GBP 20 installment without accepting a client-selected year', async () => {
    const { service, paypalService } = createService([40]);

    await service.init('507f1f77bcf86cd799439011', {
      selectedTab: 'regular',
      paymentOption: 'monthly',
      targetYear: 2020,
    });

    expect(paypalService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 20, currency: 'GBP' }),
    );
    const order = paypalService.createOrder.mock.calls[0][0];
    const metadata = JSON.parse(order.metadata);
    expect(metadata).toEqual(
      expect.objectContaining({
        isUkSubscription: true,
        paymentOption: 'monthly',
        frequency: 'Monthly',
        targetYear: new Date().getFullYear(),
      }),
    );
  });

  it('returns current-year GBP progress even before the member has paid', async () => {
    const { service } = createService();

    const response = await service.getSubscriptionStatus('507f1f77bcf86cd799439011');

    expect(response.data).toEqual(
      expect.objectContaining({
        isUkEuropeSubscription: true,
        annualTarget: 240,
        paidAmount: 0,
        remainingAmount: 240,
        isFullyPaid: false,
        bankTransferReference: 'GN-UK-001',
      }),
    );
  });

  it('charges only the outstanding balance for an annual payment', async () => {
    const { service, paypalService } = createService([40]);

    await service.init('507f1f77bcf86cd799439011', {
      selectedTab: 'regular',
      paymentOption: 'annual',
    });

    expect(paypalService.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 200, currency: 'GBP' }),
    );
  });

  it('does not start another payment after the annual target is met', async () => {
    const { service, paypalService } = createService([240]);

    await expect(
      service.init('507f1f77bcf86cd799439011', {
        selectedTab: 'regular',
        paymentOption: 'monthly',
      }),
    ).rejects.toThrow('subscription is fully paid');
    expect(paypalService.createOrder).not.toHaveBeenCalled();
  });
});
