import { PaymentIntentsController } from './payment-intents.controller';

describe('PaymentIntentsController authorization boundary', () => {
  const paymentIntentsService = {
    listForUser: jest.fn(),
    lookupForUser: jest.fn(),
    findOwnedById: jest.fn(),
    findOwnedByReference: jest.fn(),
  };
  const controller = new PaymentIntentsController(
    paymentIntentsService as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not mark lookup or requery as public', () => {
    expect(Reflect.getMetadata('isPublic', controller.lookupByEmail)).not.toBe(true);
    expect(Reflect.getMetadata('isPublic', controller.requery)).not.toBe(true);
  });

  it('scopes email lookup to the authenticated user instead of the supplied email', async () => {
    paymentIntentsService.lookupForUser.mockResolvedValue({ items: [], meta: {} });
    const body = { email: 'another-member@example.com' };

    await controller.lookupByEmail({ user: { id: 'member-123' } } as any, body as any);

    expect(paymentIntentsService.lookupForUser).toHaveBeenCalledWith('member-123', body);
  });

  it('uses an ownership-filtered lookup before requerying an intent', async () => {
    paymentIntentsService.findOwnedById.mockResolvedValue(null);

    const result = await controller.requery({ user: { id: 'member-123' } } as any, {
      intentId: '507f1f77bcf86cd799439011',
    });

    expect(paymentIntentsService.findOwnedById).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'member-123',
    );
    expect(result.success).toBe(false);
  });
});
