import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
// import { UpdateEventDto } from './dto/update-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Event } from './events.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name)
    private eventModel: Model<Event>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(
    createEventDto: CreateEventDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    try {
      let [featuredImageUrl, featuredImageCloudId] = ['', ''];
      if (file) {
        const upload = await this.cloudinaryService.uploadFile(file, 'events');
        if (upload.url) {
          featuredImageUrl = upload.secure_url;
          featuredImageCloudId = upload.public_id;
        }
      }
      const event = await this.eventModel.create({
        ...createEventDto,
        featuredImageCloudId,
        featuredImageUrl,
      });
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
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy ? { name: { $regex: searchBy, $options: 'i' } } : {};

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

  async updateOne(
    slug: string,
    updateEventDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    const NON_EDITABLES = ['slug', 'participants'];
    NON_EDITABLES.forEach((key) => {
      delete updateEventDto[key];
    });

    const event = await this.eventModel.findOne({ slug });
    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    let [featuredImageUrl, featuredImageCloudId] = [
      event.featuredImageUrl,
      event.featuredImageCloudId,
    ];
    if (file) {
      const upload = await this.cloudinaryService.uploadFile(file, 'events');
      if (upload.url) {
        featuredImageUrl = upload.secure_url;
        featuredImageCloudId = upload.public_id;
      }
      if (event.featuredImageCloudId) {
        await this.cloudinaryService.deleteFile(event.featuredImageCloudId);
      }
    }
    const newEvent = await this.eventModel.findOneAndUpdate(
      { slug },
      { ...updateEventDto, featuredImageCloudId, featuredImageUrl },
      { new: true },
    );

    return {
      success: true,
      message: 'Event updated successfully',
      data: newEvent,
    };
  }

  async removeOne(slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOneAndDelete({ slug });
    if (!event) {
      throw new NotFoundException('No event with such slug');
    }
    if (event.featuredImageCloudId) {
      await this.cloudinaryService.deleteFile(event.featuredImageCloudId);
    }

    return {
      success: true,
      message: 'Event deleted successfully',
      data: event,
    };
  }
}
