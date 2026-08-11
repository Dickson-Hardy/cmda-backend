import { DevotionalsService } from './devotionals.service';

describe('DevotionalsService scheduling', () => {
  const sortedResult: any[] = [];
  const sort = jest.fn().mockResolvedValue(sortedResult);
  const model = { find: jest.fn(() => ({ sort })) } as any;
  const service = new DevotionalsService(model);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters future devotionals from the public list', async () => {
    await service.findAll();

    expect(model.find).toHaveBeenCalledWith({
      $or: [
        { scheduledFor: { $lte: expect.any(Date) } },
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
      ],
    });
  });

  it('keeps future devotionals visible to administrators', async () => {
    await service.findAllForAdmin();

    expect(model.find).toHaveBeenCalledWith({});
  });
});
