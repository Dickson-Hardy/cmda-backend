import { ForbiddenException } from '@nestjs/common';
import { FaithEntryService } from './faithentry.service';
import { FaithEntryCategory } from './faithentry.constant';

describe('FaithEntryService ownership', () => {
  it('stores the private owner while hiding the public author for anonymous entries', async () => {
    const model: any = { create: jest.fn().mockImplementation(async (value) => value) };
    const service = new FaithEntryService(model);

    await service.create('user-1', {
      content: 'Please pray with me',
      category: FaithEntryCategory.PRAYER,
      isAnonymous: true,
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ owner: 'user-1', user: null, isAnonymous: true }),
    );
  });

  it('prevents a member from updating another member’s entry', async () => {
    const query = { select: jest.fn().mockResolvedValue({ owner: { toString: () => 'owner-1' } }) };
    const model: any = { findById: jest.fn().mockReturnValue(query) };
    const service = new FaithEntryService(model);

    await expect(
      service.update('entry-1', 'user-2', false, { content: 'Changed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
