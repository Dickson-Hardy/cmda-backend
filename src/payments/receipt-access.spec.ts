import { NotFoundException } from '@nestjs/common';
import { DonationsService } from '../donations/donations.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { DonationsController } from '../donations/donations.controller';
import { SubscriptionsController } from '../subscriptions/subscriptions.controller';
import { AdminRole } from '../admin/admin.constant';
import { UserRole } from '../users/user.constant';

describe('Receipt access control', () => {
  const requesterId = '64b64b64b64b64b64b64b641';
  const receiptId = '64b64b64b64b64b64b64b642';

  const createDonationsService = (existsResult: unknown) => {
    const exists = jest.fn().mockResolvedValue(existsResult);
    const service = new DonationsService(
      null as any,
      { exists } as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );
    return { service, exists };
  };

  const createSubscriptionsService = (existsResult: unknown) => {
    const exists = jest.fn().mockResolvedValue(existsResult);
    const service = new SubscriptionsService(
      null as any,
      { exists } as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );
    return { service, exists };
  };

  it.each([
    ['donation', createDonationsService],
    ['subscription', createSubscriptionsService],
  ] as const)('scopes a member %s receipt to its owner and paid records', async (_type, factory) => {
    const { service, exists } = factory({ _id: receiptId });

    await service.assertCanDownloadReceipt(receiptId, requesterId, false);

    expect(exists).toHaveBeenCalledWith({
      _id: receiptId,
      user: requesterId,
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    });
  });

  it.each([
    ['donation', createDonationsService],
    ['subscription', createSubscriptionsService],
  ] as const)('does not reveal a missing, unpaid, or foreign %s receipt', async (_type, factory) => {
    const { service } = factory(null);

    await expect(
      service.assertCanDownloadReceipt(receiptId, requesterId, false),
    ).rejects.toThrow(new NotFoundException('Receipt not available'));
  });

  it.each([
    ['donation', createDonationsService],
    ['subscription', createSubscriptionsService],
  ] as const)('allows an admin to fetch a paid %s receipt without owner scoping', async (_type, factory) => {
    const { service, exists } = factory({ _id: receiptId });

    await service.assertCanDownloadReceipt(receiptId, requesterId, true);

    expect(exists).toHaveBeenCalledWith({
      _id: receiptId,
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    });
  });

  it.each([
    ['donation', DonationsController],
    ['subscription', SubscriptionsController],
  ] as const)('forces a member %s export to the authenticated user', async (_type, Controller) => {
    const exportAll = jest.fn().mockResolvedValue('csv');
    const controller = new Controller({ exportAll } as any, null as any, null as any);

    await controller.exportAll(
      { user: { id: requesterId, role: UserRole.DOCTOR } } as any,
      { userId: '64b64b64b64b64b64b64b699' } as any,
    );

    expect(exportAll).toHaveBeenCalledWith({ userId: requesterId });
  });

  it.each([
    ['donation', DonationsController],
    ['subscription', SubscriptionsController],
  ] as const)('preserves scoped admin %s exports', async (_type, Controller) => {
    const exportAll = jest.fn().mockResolvedValue('csv');
    const controller = new Controller({ exportAll } as any, null as any, null as any);
    const selectedUserId = '64b64b64b64b64b64b64b699';

    await controller.exportAll(
      { user: { id: requesterId, role: AdminRole.FINANCE_MANAGER } } as any,
      { userId: selectedUserId } as any,
    );

    expect(exportAll).toHaveBeenCalledWith({ userId: selectedUserId });
  });
});
