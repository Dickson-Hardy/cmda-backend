import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ISuccessResponse } from '../_global/interface/success-response';
import { CreateResourceDto } from './dto/create-resource.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Resource } from './resources.schema';
import { Model } from 'mongoose';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectModel(Resource.name)
    private resourceModel: Model<Resource>,
  ) {}

  async create(createResourceDto: CreateResourceDto): Promise<ISuccessResponse> {
    try {
      const resource = await this.resourceModel.create(createResourceDto);
      return {
        success: true,
        message: 'Resource created successfully',
        data: resource,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Resource with title or slug already exists');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { keyword, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = keyword ? { title: { $regex: keyword, $options: 'i' } } : {};

    const resources = await this.resourceModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.resourceModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Resources fetched successfully',
      data: {
        items: resources,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(slug: string): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOne({ slug });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource fetched successfully',
      data: resource,
    };
  }

  async updateOne(slug: string, updateResourceDto): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOneAndUpdate({ slug }, updateResourceDto, {
      new: true,
    });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource updated successfully',
      data: resource,
    };
  }

  async removeOne(slug: string): Promise<ISuccessResponse> {
    const resource = await this.resourceModel.findOneAndDelete({ slug });
    if (!resource) throw new NotFoundException('Resource with slug does not exist');
    return {
      success: true,
      message: 'Resource deleted successfully',
      data: resource,
    };
  }
}
