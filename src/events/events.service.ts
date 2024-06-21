import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
// import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Event } from './events.schema';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<ISuccessResponse> {
    try {
      const event = await this.eventModel.create(createEventDto);
      return {
        success: true,
        message: 'Event created successfully',
        data: event,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Event with such name already exists');
      }
      throw error;
    }
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { keyword, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = keyword ? { name: { $regex: keyword, $options: 'i' } } : {};

    const events = await this.eventModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.eventModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Events fetched successfully',
      data: {
        items: events,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug });
    if (!event) {
      throw new NotFoundException('No event with such slug');
    }
    return {
      success: true,
      message: 'Event fetched successfully',
      data: event,
    };
  }

  async updateOne(slug: string, updateEventDto): Promise<ISuccessResponse> {
    const NON_EDITABLES = ['slug', 'participants'];
    NON_EDITABLES.forEach((key) => {
      delete updateEventDto[key];
    });
    const event = await this.eventModel.findOneAndUpdate({ slug }, updateEventDto, { new: true });
    if (!event) {
      throw new NotFoundException('No event with such slug');
    }
    return {
      success: true,
      message: 'Event updated successfully',
      data: event,
    };
  }

  async removeOne(slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOneAndDelete({ slug });
    if (!event) {
      throw new NotFoundException('No event with such slug');
    }
    return {
      success: true,
      message: 'Event deleted successfully',
      data: event,
    };
  }
}
