import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chapter, ChapterType } from './chapters.schema';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { ISuccessResponse } from '../_global/interface/success-response';

@Injectable()
export class ChaptersService {
  constructor(@InjectModel(Chapter.name) private chapterModel: Model<Chapter>) {}

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

  async findAll(type?: ChapterType): Promise<ISuccessResponse> {
    const filter = type ? { type } : {};
    const chapters = await this.chapterModel.find(filter).sort({ type: 1, name: 1 });

    return {
      success: true,
      message: 'Chapters fetched successfully',
      data: chapters,
    };
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
