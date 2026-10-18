import { EventsService } from './events.service';

describe('registered event conference filtering', () => {
  it.each([
    ['true', true],
    ['false', { $ne: true }],
    [undefined, undefined],
  ])('filters and counts the same member-owned records for %s', async (isConference, expected) => {
    const model = {
      find: jest.fn(),
      countDocuments: jest.fn().mockResolvedValue(11),
    };
    const chain = { skip: jest.fn(), limit: jest.fn(), sort: jest.fn(), lean: jest.fn().mockResolvedValue([{ _id: 'conference' }]) };
    chain.skip.mockReturnValue(chain); chain.limit.mockReturnValue(chain); chain.sort.mockReturnValue(chain);
    model.find.mockReturnValue(chain);
    const service = Object.create(EventsService.prototype) as EventsService;
    (service as any).eventModel = model;
    const result = await service.findRegistered('507f1f77bcf86cd799439011', { page: '2', limit: '10', isConference: isConference as string });
    const filter = model.find.mock.calls[0][0];
    expect(filter['registeredUsers.userId'].toString()).toBe('507f1f77bcf86cd799439011');
    expect(filter.isConference).toEqual(expected);
    expect(model.countDocuments).toHaveBeenCalledWith(filter);
    expect(chain.skip).toHaveBeenCalledWith(10);
    expect((result.data as any).pagination).toMatchObject({ currentPage: 2, totalPages: 2, totalItems: 11 });
  });
});
