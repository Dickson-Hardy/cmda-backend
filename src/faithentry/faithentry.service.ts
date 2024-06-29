import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateFaithEntryDto } from './dto/create-faithentry.dto';
import { UpdateFaithEntryDto } from './dto/update-faithentry.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { FaithEntry } from './faithentry.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

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
        user: isAnonymous ? null : id,
        content,
        category,
      });

      return {
        success: true,
        message: `${category} created successfully`,
        data: faithEntry,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Testimony or Prayer request with same content already exists');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy ? { name: { $regex: searchBy, $options: 'i' } } : {};

    const faithEntries = await this.faithEntryModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
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

  async update(id: string, updateFaithEntryDto: UpdateFaithEntryDto): Promise<ISuccessResponse> {
    const { category, isAnonymous, content } = updateFaithEntryDto;

    const faithEntry = await this.faithEntryModel.findByIdAndUpdate(
      id,
      { user: isAnonymous ? null : id, content, category },
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
