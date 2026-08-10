import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFaithEntryDto } from './dto/create-faithentry.dto';
import { UpdateFaithEntryDto } from './dto/update-faithentry.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { FaithEntry } from './faithentry.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FaithPaginationQueryDto } from './dto/faith-pagination-query.dto';

@Injectable()
export class FaithEntryService {
  constructor(
    @InjectModel(FaithEntry.name)
    private faithEntryModel: Model<FaithEntry>,
  ) {}

  async create(id: string, createFaithEntryDto: CreateFaithEntryDto): Promise<ISuccessResponse> {
    try {
      const { category, isAnonymous, content } = createFaithEntryDto;

      const faithEntry = await this.faithEntryModel.create({
        isAnonymous,
        user: isAnonymous ? null : id,
        owner: id,
        content,
        category,
      });

      return {
        success: true,
        message: `${category} created successfully`,
        data: (() => {
          const data = faithEntry.toObject ? faithEntry.toObject() : { ...faithEntry };
          delete data.owner;
          return data;
        })(),
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Faith entry with exact content already exists');
      }
      throw error;
    }
  }

  async findAll(query: FaithPaginationQueryDto): Promise<ISuccessResponse> {
    const { category, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = category ? { category } : {};

    const faithEntries = await this.faithEntryModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .populate('user', '_id fullName email membershipId');
    const totalItems = await this.faithEntryModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Testimonies & prayer requests fetched successfully',
      data: {
        items: faithEntries,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const faithEntry = await this.faithEntryModel.findById(id);
    if (!faithEntry) {
      throw new NotFoundException('No testimony or prayer request with such id');
    }
    return {
      success: true,
      message: `${faithEntry.category} fetched successfully`,
      data: faithEntry,
    };
  }

  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    updateFaithEntryDto: UpdateFaithEntryDto,
  ): Promise<ISuccessResponse> {
    const { category, isAnonymous, content } = updateFaithEntryDto;

    const existing = await this.faithEntryModel.findById(id).select('+owner');
    if (!existing) {
      throw new NotFoundException('No testimony or prayer request with such id');
    }

    const ownerId = existing.owner?.toString() || existing.user?.toString();
    if (!isAdmin && ownerId !== userId) {
      throw new ForbiddenException('You can only update your own Faith Entry');
    }

    const nextAnonymous = isAnonymous ?? existing.isAnonymous;
    const update: Record<string, unknown> = {
      user: nextAnonymous ? null : ownerId || userId,
      owner: ownerId || userId,
    };
    if (content !== undefined) update.content = content;
    if (category !== undefined) update.category = category;
    if (isAnonymous !== undefined) update.isAnonymous = isAnonymous;

    const faithEntry = await this.faithEntryModel.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true },
    );
    if (!faithEntry) {
      throw new NotFoundException('No testimony or prayer request with such id');
    }
    return {
      success: true,
      message: `${faithEntry.category} updated successfully`,
      data: faithEntry,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const faithEntry = await this.faithEntryModel.findByIdAndDelete(id);
    if (!faithEntry) {
      throw new NotFoundException('No testimony or prayer request with such id');
    }
    return {
      success: true,
      message: `${faithEntry.category} deleted successfully`,
      data: faithEntry,
    };
  }
}
