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
      findByIdAndUpdate: jest.fn().mockResolvedValue({ ...user, subscribed: true }),
    };
    const subscriptionModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(paidAmounts.map((amount) => ({ amount }))),
        }),
      }),
      exists: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({ _id: 'subscription-id' }),
    };
    const paypalService = {
      createOrder: jest.fn().mockResolvedValue({ id: 'PAYPAL-ORDER' }),
    };
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const emailService = {
      sendSubscriptionConfirmedEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    return {
      service: new SubscriptionsService(
        userModel as any,
        subscriptionModel as any,
        {} as any,
        paypalService as any,
        configService as any,
        emailService as any,
        {} as any,
      ),
      paypalService,
      subscriptionModel,
      emailService,
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

  it('keeps a verified bank payment successful when confirmation email delivery fails', async () => {
    const { service, subscriptionModel, emailService } = createService();
    emailService.sendSubscriptionConfirmedEmail.mockRejectedValueOnce(
      new Error('mail unavailable'),
    );
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await service.activate('507f1f77bcf86cd799439011', '2020', {
      amount: 20,
      reference: 'UK-BANK-001',
    });

    expect(response.success).toBe(true);
    expect(subscriptionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 20,
        currency: 'GBP',
        reference: 'UK-BANK-001',
        subscriptionYear: new Date().getFullYear(),
      }),
    );
    consoleError.mockRestore();
  });

  it('requires a bank reference for admin-recorded UK payments', async () => {
    const { service } = createService();

    await expect(
      service.activate('507f1f77bcf86cd799439011', String(new Date().getFullYear()), {
        amount: 20,
      }),
    ).rejects.toThrow('Bank transfer reference is required');
  });

  it('rejects a duplicate admin bank transfer reference', async () => {
    const { service, subscriptionModel } = createService();
    subscriptionModel.exists.mockResolvedValueOnce(true);

    await expect(
      service.activate('507f1f77bcf86cd799439011', String(new Date().getFullYear()), {
        amount: 20,
        reference: 'UK-BANK-001',
      }),
    ).rejects.toThrow('bank transfer reference has already been recorded');
    expect(subscriptionModel.create).not.toHaveBeenCalled();
  });
});
