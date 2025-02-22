import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { Event } from './events.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AllEventAudiences } from './events.constant';
import { EventPaginationQueryDto } from './dto/event-pagination.dto';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { PaypalService } from '../paypal/paypal.service';
import { ConfirmEventPayDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
    private cloudinaryService: CloudinaryService,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private paypalService: PaypalService,
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
        paymentPlans: createEventDto.paymentPlans ? JSON.parse(createEventDto.paymentPlans) : [],
        membersGroup: !createEventDto.membersGroup.length
          ? AllEventAudiences
          : createEventDto.membersGroup,
        featuredImageCloudId,
        featuredImageUrl,
        registeredUsers: [],
      });
      return {
        success: true,
        message: 'Event created successfully',
        data: event,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('One or more properties of Event has conflicts');
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
    const eventStats = await this.eventModel.aggregate([
      { $match: { slug } }, // Find the event by slug

      {
        $lookup: {
          from: 'users', // MongoDB collection name (ensure it's lowercase)
          localField: 'registeredUsers.userId',
          foreignField: '_id',
          as: 'populatedUsers',
        },
      },

      {
        $addFields: {
          registeredUsers: {
            $map: {
              input: '$registeredUsers',
              as: 'regUser',
              in: {
                userId: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$populatedUsers',
                        as: 'populatedUser',
                        cond: { $eq: ['$$populatedUser._id', '$$regUser.userId'] },
                      },
                    },
                    0,
                  ],
                },
                paymentReference: '$$regUser.paymentReference',
              },
            },
          },
        },
      },

      { $project: { populatedUsers: 0 } }, // Remove the extra populatedUsers array
    ]);

    if (!eventStats.length) {
      throw new NotFoundException('No event with such slug');
    }

    const event = eventStats[0];

    // Count user roles
    const totalRegistered = event.registeredUsers.length;
    const roleCounts = {
      studentsRegistered: 0,
      doctorsRegistered: 0,
      globalNetworkRegistered: 0,
    };

    event.registeredUsers.forEach((regUser) => {
      if (regUser.userId) {
        if (regUser.userId.role === UserRole.STUDENT) roleCounts.studentsRegistered++;
        if (regUser.userId.role === UserRole.DOCTOR) roleCounts.doctorsRegistered++;
        if (regUser.userId.role === UserRole.GLOBALNETWORK) roleCounts.globalNetworkRegistered++;
      }
    });

    return {
      success: true,
      message: 'Event statistics fetched successfully',
      data: {
        totalRegistered,
        ...roleCounts,
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
      {
        ...updateEventDto,
        paymentPlans: JSON.parse(updateEventDto.paymentPlans),
        featuredImageCloudId,
        featuredImageUrl,
      },
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

  async registerForEvent(
    userId: string, // Accept userId as a string
    slug: string,
    reference?: string,
  ): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug });

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    const userObjectId = new mongoose.Types.ObjectId(
      userId,
    ) as unknown as mongoose.Schema.Types.ObjectId;

    const isAlreadyRegistered = event.registeredUsers.some(
      (user) => user.userId.toString() === userObjectId.toString(),
    );

    if (isAlreadyRegistered) {
      throw new ConflictException('User is already registered for this event');
    }

    if (event.isPaid && !reference) {
      throw new BadRequestException('Payment reference is required for paid events');
    }

    event.registeredUsers.push({ userId: userObjectId, paymentReference: reference });
    await event.save();

    return {
      success: true,
      message: 'Successfully registered for the event',
      data: event,
    };
  }

  async payForEvent(userId: string, slug: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug }).lean();

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    // Check if user is already registered
    const isRegistered = event.registeredUsers.some((user) => user.toString() === userId);
    if (isRegistered) {
      throw new ConflictException('User is already registered for this event');
    }

    let transaction: any;

    const user = await this.userModel.findById(userId);
    const amount = event.paymentPlans.find((p: any) => p.role == user.role).price;

    if (user.role === UserRole.GLOBALNETWORK) {
      transaction = await this.paypalService.createOrder({
        amount,
        currency: 'USD',
        description: 'EVENT',
        metadata: JSON.stringify({ eventId: event._id, userId }),
        items: [{ name: 'EVENT - ' + event.name, quantity: 1, amount }],
      });
    } else {
      transaction = await this.paystackService.initializeTransaction({
        amount: event.paymentPlans.find((p: any) => p.role == user.role).price * 100,
        email: user.email,
        callback_url: this.configService.get('EVENT_PAYMENT_SUCCESS_URL').replace('[slug]', slug),
        metadata: JSON.stringify({ slug, userId, name: user.fullName }),
      });
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
    }

    return {
      success: true,
      message: 'Event payment session initiated',
      data:
        user.role === UserRole.GLOBALNETWORK
          ? transaction
          : { checkout_url: transaction.data.authorization_url },
    };
  }

  async confirmEventPayment(confirmDto: ConfirmEventPayDto): Promise<ISuccessResponse> {
    const { reference, source } = confirmDto;
    let response: ISuccessResponse;

    if (source && source?.toLowerCase() === 'paypal') {
      const transaction = await this.paypalService.captureOrder(reference);

      if (transaction?.status !== 'COMPLETED') {
        throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
      }
      const details = transaction.purchase_units[0].payments.captures[0];

      let metadata: any = await Buffer.from(details.custom_id, 'base64').toString('utf-8');
      metadata = JSON.parse(metadata);
      const { eventId, userId } = metadata;

      const event = await this.eventModel.findById(eventId);
      response = await this.registerForEvent(userId, event.slug);
      //
    } else {
      const transaction = await this.paystackService.verifyTransaction(reference);
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
      const {
        metadata: { slug, userId },
      } = transaction.data;

      response = await this.registerForEvent(userId, slug, reference);
    }

    return response;
  }

  async findRegistered(userId: string, query: EventPaginationQueryDto): Promise<ISuccessResponse> {
    const { limit, page, searchBy } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Build the search criteria
    const searchCriteria: any = { registeredUsers: { $in: [userId] } };

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
