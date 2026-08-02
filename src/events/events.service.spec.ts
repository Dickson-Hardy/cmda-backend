import { BadRequestException } from '@nestjs/common';
import { EventsService } from './events.service';

describe('EventsService date filters', () => {
  const createService = () => {
    const skip = jest.fn().mockResolvedValue([]);
    const limit = jest.fn().mockReturnValue({ skip });
    const sort = jest.fn().mockReturnValue({ limit });
    const find = jest.fn().mockReturnValue({ sort });
    const countDocuments = jest.fn().mockResolvedValue(0);
    const eventModel = { find, countDocuments };

    const service = new EventsService(
      eventModel as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
    );

    return { service, find };
  };

  it('builds an inclusive eventDateTime range', async () => {
    const { service, find } = createService();

    await service.findAll({ fromDate: '2026-08-02', toDate: '2026-08-08' });

    expect(find).toHaveBeenCalledWith({
      eventDateTime: {
        $gte: new Date('2026-08-02T00:00:00+01:00'),
        $lte: new Date('2026-08-08T23:59:59+01:00'),
      },
    });
  });

  it('rejects conflicting date modes before querying MongoDB', async () => {
    const { service, find } = createService();

    await expect(
      service.findAll({ eventDate: '2026-08-02', fromToday: 'true' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(find).not.toHaveBeenCalled();
  });

  it('rejects an incomplete range', async () => {
    const { service, find } = createService();

    await expect(service.findAll({ fromDate: '2026-08-02' })).rejects.toBeInstanceOf(BadRequestException);
    expect(find).not.toHaveBeenCalled();
  });
});
