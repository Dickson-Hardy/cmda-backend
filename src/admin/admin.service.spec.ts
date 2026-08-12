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

describe('AdminService lifetime member import', () => {
  const member = {
    _id: { toString: () => '507f1f77bcf86cd799439011' },
    fullName: 'Ada Member',
    email: 'ada@example.com',
    phone: '+234 800 000 0000',
    role: 'Doctor',
    region: '',
    hasLifetimeMembership: false,
  };

  it('matches safely using normalized email, phone and full name', async () => {
    const query = {
      select: jest.fn(),
      lean: jest.fn().mockResolvedValue([member]),
    };
    query.select.mockReturnValue(query);
    const userModel = { find: jest.fn().mockReturnValue(query) } as any;
    const service = new AdminService(null, userModel, null, null);

    const response: any = await service.previewLifetimeMemberImport({
      fileName: 'members.xlsx',
      rows: [
        {
          rowNumber: 2,
          fullName: 'ADA  MEMBER',
          email: ' ADA@EXAMPLE.COM ',
          phone: '08000000000',
          category: 'Nigerian Lifetime',
          chapter: 'Lagos',
        },
      ],
    });

    expect(response.data.counts.matched).toBe(1);
    expect(response.data.rows[0].match.userId).toBe('507f1f77bcf86cd799439011');
    expect(response.data.rows[0].proposedUpdates).toContain('Add chapter/region: Lagos');
  });

  it('rejects a Global Network row without a valid lifetime tier', async () => {
    const query = {
      select: jest.fn(),
      lean: jest.fn().mockResolvedValue([{ ...member, role: 'GlobalNetwork' }]),
    };
    query.select.mockReturnValue(query);
    const userModel = { find: jest.fn().mockReturnValue(query) } as any;
    const service = new AdminService(null, userModel, null, null);

    const response: any = await service.previewLifetimeMemberImport({
      fileName: 'members.xlsx',
      rows: [{ rowNumber: 2, fullName: 'Ada Member', email: 'ada@example.com' }],
    });

    expect(response.data.rows[0].status).toBe('invalid');
    expect(response.data.rows[0].reason).toContain('Gold, Platinum or Diamond');
  });

  it('flags duplicate spreadsheet rows instead of importing the same member twice', async () => {
    const query = {
      select: jest.fn(),
      lean: jest.fn().mockResolvedValue([member]),
    };
    query.select.mockReturnValue(query);
    const userModel = { find: jest.fn().mockReturnValue(query) } as any;
    const service = new AdminService(null, userModel, null, null);
    const duplicateRow = {
      fullName: 'Ada Member',
      email: 'ada@example.com',
      category: 'Lifetime',
    };

    const response: any = await service.previewLifetimeMemberImport({
      fileName: 'members.xlsx',
      rows: [
        { ...duplicateRow, rowNumber: 2 },
        { ...duplicateRow, rowNumber: 3 },
      ],
    });

    expect(response.data.counts.ambiguous).toBe(2);
    expect(response.data.rows[0].reason).toContain('more than once');
  });

  it('imports only a revalidated confirmed match and preserves existing contact fields', async () => {
    const query = {
      select: jest.fn(),
      lean: jest.fn().mockResolvedValue([{ ...member, region: 'Abuja' }]),
    };
    query.select.mockReturnValue(query);
    const userModel = {
      find: jest.fn().mockReturnValue(query),
      bulkWrite: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    } as any;
    const service = new AdminService(null, userModel, null, null);

    const response: any = await service.confirmLifetimeMemberImport(
      {
        fileName: 'members.xlsx',
        rows: [
          {
            rowNumber: 2,
            userId: '507f1f77bcf86cd799439011',
            fullName: 'Ada Member',
            email: 'ada@example.com',
            phone: '08009999999',
            category: 'Lifetime',
            chapter: 'Lagos',
          },
        ],
      },
      'admin-1',
    );

    const update = userModel.bulkWrite.mock.calls[0][0][0].updateOne.update.$set;
    expect(response.data.imported).toBe(1);
    expect(update.hasLifetimeMembership).toBe(true);
    expect(update.lifetimeMembershipType).toBe('lifetime');
    expect(update.lifetimeImportSource).toBe('members.xlsx');
    expect(update).not.toHaveProperty('phone');
    expect(update).not.toHaveProperty('region');
  });
});
