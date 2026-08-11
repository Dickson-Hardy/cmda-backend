import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateDevotionalDto } from './dto/create-devotional.dto';
import { UpdateDevotionalDto } from './dto/update-devotional.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { InjectModel } from '@nestjs/mongoose';
import { Devotional } from './devotional.schema';
import { Model } from 'mongoose';

@Injectable()
export class DevotionalsService {
  constructor(
    @InjectModel(Devotional.name)
    private devotionalModel: Model<Devotional>,
  ) {}

  async create(createDevotionalDto: CreateDevotionalDto): Promise<ISuccessResponse> {
    try {
      const devotional = await this.devotionalModel.create(createDevotionalDto);
      return {
        success: true,
        message: 'Devotional created successfully',
        data: devotional,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Devotional with such title already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<ISuccessResponse> {
    const devotionals = await this.devotionalModel
      .find(this.publishedCriteria())
      .sort({ scheduledFor: -1, createdAt: -1 });
    return {
      success: true,
      message: 'Devotionals fetched successfully',
      data: devotionals,
    };
  }

  async findAllForAdmin(): Promise<ISuccessResponse> {
    const devotionals = await this.devotionalModel
      .find({})
      .sort({ scheduledFor: -1, createdAt: -1 });
    return {
      success: true,
      message: 'Devotional schedule fetched successfully',
      data: devotionals,
    };
  }

  async findLatest(): Promise<ISuccessResponse> {
    const devotionals = await this.devotionalModel
      .find(this.publishedCriteria())
      .sort({ scheduledFor: -1, createdAt: -1 })
      .limit(1);
    return {
      success: true,
      message: 'Latest devotional fetched successfully',
      data: devotionals[0],
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const devotional = await this.devotionalModel.findOne({
      _id: id,
      ...this.publishedCriteria(),
    });
    if (!devotional) {
      throw new NotFoundException('No published devotional with such id');
    }
    return {
      success: true,
      message: 'Devotional fetched successfully',
      data: devotional,
    };
  }

  private publishedCriteria() {
    return {
      $or: [
        { scheduledFor: { $lte: new Date() } },
        { scheduledFor: { $exists: false } },
        { scheduledFor: null },
      ],
    };
  }

  async update(id: string, updateDevotionalDto: UpdateDevotionalDto): Promise<ISuccessResponse> {
    const devotional = await this.devotionalModel.findByIdAndUpdate(id, updateDevotionalDto, {
      new: true,
    });
    if (!devotional) {
      throw new NotFoundException('No devotional with such id');
    }
    return {
      success: true,
      message: 'Devotional updated successfully',
      data: devotional,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const devotional = await this.devotionalModel.findByIdAndDelete(id);
    if (!devotional) {
      throw new NotFoundException('No devotional with such id');
    }
    return {
      success: true,
      message: 'Devotional deleted successfully',
      data: devotional,
    };
  }
}
