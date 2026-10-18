import { ZelleService } from './zelle.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('Zelle transfer approval', () => {
  const setup = () => {
    const intents = {
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue({ status: 'SUCCESSFUL' }),
      findOne: jest.fn(),
    };
    const subscriptions = {
      recordZellePayment: jest.fn(),
      quoteGlobalInstallment: jest.fn(),
      hasZellePayment: jest.fn().mockResolvedValue(false),
    };
    const donations = { findOneAndUpdate: jest.fn() };
    const service = new ZelleService(
      {} as any,
      intents as any,
      {} as any,
      donations as any,
      {} as any,
      subscriptions as any,
    );
    return { service, intents, subscriptions, donations };
  };
  const intent = {
    _id: 'id',
    provider: 'ZELLE',
    user: 'member',
    amount: 10,
    context: 'SUBSCRIPTION',
    contextData: { targetYear: 2026 },
    providerReference: 'ZELLE-INT-1',
  };
  it('records the approved installment before marking the intent successful', async () => {
    const { service, intents, subscriptions } = setup();
    intents.findOneAndUpdate.mockResolvedValue(intent);
    await service.review('id', 'finance', {
      decision: 'approve',
      note: 'Matched bank transaction',
    });
    expect(subscriptions.recordZellePayment).toHaveBeenCalledWith(intent);
    expect(intents.findByIdAndUpdate).toHaveBeenCalledWith(
      'id',
      expect.objectContaining({ status: 'SUCCESSFUL', reviewedBy: 'finance' }),
      { new: true },
    );
    expect(subscriptions.recordZellePayment.mock.invocationCallOrder[0]).toBeLessThan(
      intents.findByIdAndUpdate.mock.invocationCallOrder[0],
    );
  });
  it('rejects duplicate or concurrent approvals without crediting again', async () => {
    const { service, intents, subscriptions } = setup();
    intents.findOneAndUpdate.mockResolvedValue(null);
    await expect(
      service.review('id', 'finance', { decision: 'approve', note: 'Matched' }),
    ).rejects.toThrow('already reviewed');
    expect(subscriptions.recordZellePayment).not.toHaveBeenCalled();
  });
  it('does not credit a rejected proof', async () => {
    const { service, intents, subscriptions, donations } = setup();
    intents.findOneAndUpdate.mockResolvedValue(intent);
    await service.review('id', 'finance', { decision: 'reject', note: 'No matching transfer' });
    expect(subscriptions.recordZellePayment).not.toHaveBeenCalled();
    expect(donations.findOneAndUpdate).not.toHaveBeenCalled();
    expect(intents.findByIdAndUpdate).toHaveBeenCalledWith(
      'id',
      expect.objectContaining({ status: 'FAILED' }),
      { new: true },
    );
  });

  it('does not reject a payment already credited before an interrupted approval', async () => {
    const { service, intents, subscriptions } = setup();
    intents.findOneAndUpdate.mockResolvedValue(intent);
    subscriptions.hasZellePayment.mockResolvedValue(true);
    await expect(
      service.review('id', 'finance', { decision: 'reject', note: 'Reject attempt' }),
    ).rejects.toThrow('already been credited');
    expect(intents.findByIdAndUpdate).not.toHaveBeenCalledWith(
      'id',
      expect.objectContaining({ status: 'FAILED' }),
      expect.anything(),
    );
  });
  it('allows a failed credit operation to be retried', async () => {
    const { service, intents, subscriptions } = setup();
    intents.findOneAndUpdate.mockResolvedValue(intent);
    subscriptions.recordZellePayment.mockRejectedValue(new Error('database unavailable'));
    await expect(
      service.review('id', 'finance', { decision: 'approve', note: 'Matched' }),
    ).rejects.toThrow('database unavailable');
    expect(intents.findByIdAndUpdate).toHaveBeenCalledWith('id', { status: 'AWAITING_REVIEW' });
  });
  it('rejects uploading proof against another member or a reviewed transfer', async () => {
    const { service, intents } = setup();
    intents.findOne.mockResolvedValue(null);
    await expect(service.upload('other-member', 'id', 'reference', undefined)).rejects.toThrow(
      'Pending Zelle payment not found',
    );
    expect(intents.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ user: 'other-member', status: { $in: ['PENDING', 'FAILED'] } }),
    );
  });
});

describe('Global annual installments', () => {
  const user = {
    _id: 'member',
    role: 'GlobalNetwork',
    incomeBracket: 'less_than_50k',
    region: 'The Americas Region',
  };
  const setup = (payments: any[]) => {
    const model = {
      find: jest.fn().mockReturnValue({ sort: () => ({ lean: async () => payments }) }),
    };
    const service = new SubscriptionsService(
      { findById: async () => user } as any,
      model as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
    return { service, model };
  };
  it('shows 90 remaining after a confirmed 10 installment toward a 100 target', async () => {
    const { service, model } = setup([{ amount: 10, incomeBracket: 'less_than_50k' }]);
    await expect(service.getGlobalProgress(user as any)).resolves.toEqual(
      expect.objectContaining({
        annualTarget: 100,
        paidAmount: 10,
        remainingAmount: 90,
        isFullyPaid: false,
      }),
    );
    expect(model.find).toHaveBeenCalledWith(
      expect.objectContaining({ isPaid: true, currency: 'USD', isLifetime: { $ne: true } }),
    );
  });
  it('keeps the original target once payment has started', async () => {
    const { service } = setup([{ amount: 10, incomeBracket: 'less_than_50k' }]);
    await expect(
      service.getGlobalProgress(user as any, 2026, 'students_unemployed'),
    ).resolves.toEqual(
      expect.objectContaining({ annualTarget: 100, incomeBracket: 'less_than_50k' }),
    );
  });
  it('accepts another 10 installment and rejects an amount over the remaining balance', async () => {
    const { service } = setup([{ amount: 10, incomeBracket: 'less_than_50k' }]);
    await expect(service.quoteGlobalInstallment('member', { amount: 10 })).resolves.toEqual(
      expect.objectContaining({ amount: 10 }),
    );
    await expect(service.quoteGlobalInstallment('member', { amount: 100 })).rejects.toThrow(
      'remaining balance',
    );
  });
});
