import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { Event } from './events.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AllEventAudiences } from './events.constant';
import { EventPaginationQueryDto } from './dto/event-pagination.dto';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';

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
      } else {
        throw new BadRequestException('featuredImage is required');
      }

      const event = await this.eventModel.create({
        ...createEventDto,
        membersGroup: !createEventDto.membersGroup.length
          ? AllEventAudiences
          : createEventDto.membersGroup,
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

  async findAll(query: EventPaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, eventType, membersGroup, eventDate, fromToday } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const searchCriteria: any = {};
    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(searchBy, 'i') },
        { eventType: new RegExp(searchBy, 'i') },
        { linkOrLocation: new RegExp(searchBy, 'i') },
        { eventDateTime: new RegExp(searchBy, 'i') },
      ];
    }
    if (eventType) searchCriteria.eventType = eventType;
    if (membersGroup) searchCriteria.membersGroup = membersGroup;

    if (eventDate && String(fromToday) === 'true') {
      throw new BadRequestException('Please use only one of eventDate or fromToday');
    }

    if (eventDate) {
      const startOfDay = new Date(`${eventDate}T00:00:00+01:00`);
      const endOfDay = new Date(`${eventDate}T23:59:59+01:00`);
      searchCriteria.eventDateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (String(fromToday) === 'true') {
      const today = new Date().toISOString().split('T')[0];
      const startOfToday = new Date(`${today}T00:00:00+01:00`);
      searchCriteria.eventDateTime = { $gte: startOfToday };
    }

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

  async findOneStat(slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel
      .findOne({ slug })
      .populate('registeredUsers', '_id fullName email role region');

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    // Calculate the number of users in each audience group
    const totalRegistered = event.registeredUsers.length;
    const studentsRegistered = event.registeredUsers.filter(
      (user: User) => user.role === UserRole.STUDENT,
    ).length;
    const doctorsRegistered = event.registeredUsers.filter(
      (user: User) => user.role === UserRole.DOCTOR,
    ).length;
    const globalNetworkRegistered = event.registeredUsers.filter(
      (user: User) => user.role === UserRole.GLOBALNETWORK,
    ).length;

    return {
      success: true,
      message: 'Event statistics fetched successfully',
      data: {
        totalRegistered,
        studentsRegistered,
        doctorsRegistered,
        globalNetworkRegistered,
        registeredUsers: event.registeredUsers,
      },
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

  async registerForEvent(userId: any, slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug });

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    // Check if user is already registered
    const isRegistered = event.registeredUsers.some((user) => user.toString() === userId);
    if (isRegistered) {
      throw new ConflictException('User is already registered for this event');
    }

    // Register user for the event
    event.registeredUsers.push(userId);
    await event.save();

    return {
      success: true,
      message: 'Successfully registered for the event',
      data: event,
    };
  }

  async findRegistered(userId: string, query: EventPaginationQueryDto): Promise<ISuccessResponse> {
    const { limit, page, searchBy } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Build the search criteria
    const searchCriteria: any = {
      registeredUsers: { $in: [userId] }, // Ensure the user is registered for the event
    };

    // If searchBy is provided, add the search conditions to the criteria
    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(searchBy, 'i') },
        { eventType: new RegExp(searchBy, 'i') },
        { linkOrLocation: new RegExp(searchBy, 'i') },
        { eventDateTime: new RegExp(searchBy, 'i') },
      ];
    }

    // Fetch events that match the search criteria and pagination
    const events = await this.eventModel
      .find(searchCriteria)
      .sort({ eventDateTime: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.eventModel.countDocuments({ registeredUsers: userId });
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Registered events fetched successfully',
      data: {
        items: events,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }
}
