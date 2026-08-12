import { AdminService } from './admin.service';

describe('AdminService onboarding analytics pagination', () => {
  it('paginates pending members and returns pagination metadata', async () => {
    const pendingMembers = [{ _id: 'member-21', firstName: 'Ada' }];
    const query = {
      select: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn().mockResolvedValue(pendingMembers),
    };
    query.select.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.skip.mockReturnValue(query);

    const userModel = {
      countDocuments: jest
        .fn()
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(40)
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(70),
      find: jest.fn().mockReturnValue(query),
    } as any;
    const service = new AdminService(null, userModel, null, null);

    const response: any = await service.getMemberAnalytics({ page: 2, limit: 20 });

    expect(query.skip).toHaveBeenCalledWith(20);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(response.data.pendingMembers).toEqual(pendingMembers);
    expect(response.data.pendingPagination).toEqual({
      page: 2,
      limit: 20,
      total: 70,
      totalPages: 4,
    });
  });
});
