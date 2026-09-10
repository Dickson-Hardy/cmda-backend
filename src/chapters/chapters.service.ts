import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chapter, ChapterType } from './chapters.schema';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ChapterQueryDto } from './dto/chapter-query.dto';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';

const CHAPTER_MEMBER_ROLE: Record<ChapterType, UserRole> = {
  [ChapterType.STUDENT]: UserRole.STUDENT,
  [ChapterType.DOCTOR]: UserRole.DOCTOR,
  [ChapterType.GLOBAL]: UserRole.GLOBALNETWORK,
};

@Injectable()
export class ChaptersService {
  constructor(
    @InjectModel(Chapter.name) private chapterModel: Model<Chapter>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createChapterDto: CreateChapterDto): Promise<ISuccessResponse> {
    const existing = await this.chapterModel.findOne({
      name: createChapterDto.name,
      type: createChapterDto.type,
    });

    if (existing) {
      throw new ConflictException('Chapter with this name and type already exists');
    }

    const chapter = await this.chapterModel.create(createChapterDto);

    return {
      success: true,
      message: 'Chapter created successfully',
      data: chapter,
    };
  }

  async findAll(query: ChapterQueryDto = {}): Promise<ISuccessResponse> {
    const { type, page, limit } = query;
    const filter = type ? { type } : {};
    const paginationRequested = page !== undefined || limit !== undefined;
    const currentPage = page ?? 1;
    const itemsPerPage = limit ?? 10;

    const chaptersQuery = this.chapterModel.find(filter).sort({ type: 1, name: 1 });
    if (paginationRequested) {
      chaptersQuery.skip(itemsPerPage * (currentPage - 1)).limit(itemsPerPage);
    }

    const [chapters, totalItems] = await Promise.all([
      chaptersQuery.lean(),
      paginationRequested ? this.chapterModel.countDocuments(filter) : Promise.resolve(0),
    ]);
    const memberCounts = await this.getMemberCounts(chapters);
    const items = chapters.map((chapter) => ({
      ...chapter,
      memberCount: memberCounts.get(this.memberCountKey(chapter.name, chapter.type)) ?? 0,
    }));

    return {
      success: true,
      message: 'Chapters fetched successfully',
      data: paginationRequested
        ? {
            items,
            meta: {
              currentPage,
              itemsPerPage,
              totalItems,
              totalPages: Math.ceil(totalItems / itemsPerPage),
            },
          }
        : items,
    };
  }

  private async getMemberCounts(
    chapters: Array<{ name: string; type: ChapterType }>,
  ): Promise<Map<string, number>> {
    if (chapters.length === 0) return new Map();

    const chapterNames = [...new Set(chapters.map(({ name }) => name))];
    const counts = await this.userModel.aggregate<{
      _id: { region: string; role: UserRole };
      count: number;
    }>([
      {
        $match: {
          region: { $in: chapterNames },
          role: { $in: Object.values(CHAPTER_MEMBER_ROLE) },
        },
      },
      {
        $group: {
          _id: { region: '$region', role: '$role' },
          count: { $sum: 1 },
        },
      },
    ]);

    return new Map(counts.map(({ _id, count }) => [`${_id.region}\u0000${_id.role}`, count]));
  }

  private memberCountKey(name: string, type: ChapterType): string {
    return `${name}\u0000${CHAPTER_MEMBER_ROLE[type]}`;
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const chapter = await this.chapterModel.findById(id);

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    return {
      success: true,
      message: 'Chapter fetched successfully',
      data: chapter,
    };
  }

  async update(id: string, updateChapterDto: UpdateChapterDto): Promise<ISuccessResponse> {
    const chapter = await this.chapterModel.findByIdAndUpdate(id, updateChapterDto, {
      new: true,
    });

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    return {
      success: true,
      message: 'Chapter updated successfully',
      data: chapter,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const chapter = await this.chapterModel.findByIdAndDelete(id);

    if (!chapter) {
      throw new NotFoundException('Chapter not found');
    }

    return {
      success: true,
      message: 'Chapter deleted successfully',
      data: chapter,
    };
  }

  async getStats(): Promise<ISuccessResponse> {
    const [studentCount, doctorCount, globalCount, totalActive] = await Promise.all([
      this.chapterModel.countDocuments({ type: ChapterType.STUDENT }),
      this.chapterModel.countDocuments({ type: ChapterType.DOCTOR }),
      this.chapterModel.countDocuments({ type: ChapterType.GLOBAL }),
      this.chapterModel.countDocuments({ isActive: true }),
    ]);

    return {
      success: true,
      message: 'Chapter statistics fetched successfully',
      data: {
        student: studentCount,
        doctor: doctorCount,
        global: globalCount,
        totalActive,
        total: studentCount + doctorCount + globalCount,
      },
    };
  }

  async updateMemberCount(chapterName: string, chapterType: ChapterType): Promise<void> {
    await this.chapterModel.findOneAndUpdate(
      { name: chapterName, type: chapterType },
      { $inc: { memberCount: 1 } },
    );
  }
}
