import { ChaptersService } from './chapters.service';
import { ChapterType } from './chapters.schema';
import { UserRole } from '../users/user.constant';

describe('ChaptersService', () => {
  const chapters = [
    { _id: 'chapter-1', name: 'Adamawa', type: ChapterType.DOCTOR, memberCount: 0 },
    { _id: 'chapter-2', name: 'Africa Region', type: ChapterType.GLOBAL, memberCount: 0 },
  ];

  const makeService = () => {
    const chaptersQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(chapters),
    };
    const chapterModel = {
      find: jest.fn().mockReturnValue(chaptersQuery),
      countDocuments: jest.fn().mockResolvedValue(12),
    };
    const userModel = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: { region: 'Adamawa', role: UserRole.DOCTOR }, count: 7 },
        { _id: { region: 'Africa Region', role: UserRole.GLOBALNETWORK }, count: 3 },
      ]),
    };

    return {
      service: new ChaptersService(chapterModel as any, userModel as any),
      chapterModel,
      chaptersQuery,
      userModel,
    };
  };

  it('returns a paginated chapter page with live member counts', async () => {
    const { service, chapterModel, chaptersQuery } = makeService();

    const response = await service.findAll({ page: 2, limit: 5 });

    expect(chaptersQuery.skip).toHaveBeenCalledWith(5);
    expect(chaptersQuery.limit).toHaveBeenCalledWith(5);
    expect(chapterModel.countDocuments).toHaveBeenCalledWith({});
    expect(response.data).toEqual({
      items: [
        expect.objectContaining({ name: 'Adamawa', memberCount: 7 }),
        expect.objectContaining({ name: 'Africa Region', memberCount: 3 }),
      ],
      meta: {
        currentPage: 2,
        itemsPerPage: 5,
        totalItems: 12,
        totalPages: 3,
      },
    });
  });

  it('preserves the unpaginated response used by member signup clients', async () => {
    const { service, chapterModel, chaptersQuery } = makeService();

    const response = await service.findAll({ type: ChapterType.DOCTOR });

    expect(chaptersQuery.skip).not.toHaveBeenCalled();
    expect(chaptersQuery.limit).not.toHaveBeenCalled();
    expect(chapterModel.countDocuments).not.toHaveBeenCalled();
    expect(Array.isArray(response.data)).toBe(true);
  });
});
