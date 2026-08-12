import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { Event } from './events.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import {
  AllEventAudiences,
  ConferenceType,
  ConferenceZone,
  ConferenceRegion,
  RegistrationPeriod,
  getUserEventAudience,
} from './events.constant';
import { EventPaginationQueryDto } from './dto/event-pagination.dto';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { PaypalService } from '../paypal/paypal.service';
import { ConfirmEventPayDto } from './dto/update-event.dto';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { PaystackFeeCalculator } from '../_global/utils/paystack-fees.util';
import { EventRegistrationDraft } from './event-registration-draft.schema';
import { escapeRegex } from '../_common/escape-regex.util';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotificationType } from '../notifications/notification.constant';

// Type for Event with computed registrationStatus
type EventWithRegistrationStatus = Event & {
  registrationStatus?: 'regular' | 'late' | 'closed';
};

type AccommodationSelection = {
  optionId: string;
  name: string;
  description?: string;
  price: number;
  currency: 'NGN' | 'USD';
};

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
    private cloudinaryService: CloudinaryService,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private paypalService: PaypalService,
    private emailService: EmailService,
    private usersService: UsersService,
    @InjectModel(EventRegistrationDraft.name)
    private registrationDraftModel: Model<EventRegistrationDraft>,
    private notificationDispatcher?: NotificationDispatcherService,
  ) {}

  private async notifyEventAudience(event: Event, action: 'created' | 'updated'): Promise<void> {
    const users = await this.userModel
      .find({ isActive: { $ne: false } })
      .select('_id role yearsOfExperience')
      .lean();
    const audiences = (event.membersGroup || []) as unknown as string[];
    const recipients = users.filter((user: any) => {
      try {
        return audiences.includes(getUserEventAudience(user.role, user.yearsOfExperience));
      } catch {
        return false;
      }
    });
    await this.notificationDispatcher?.notifyMany(
      recipients.map((user: any) => ({
        userId: user._id.toString(),
        type: NotificationType.EVENT,
        title: action === 'created' ? 'New CMDA event' : 'Event updated',
        body: `${event.name} has been ${action}.`,
        idempotencyKey: `event:${event._id}:${action}:${
          action === 'updated' ? new Date((event as any).updatedAt).toISOString() : 'initial'
        }`,
        preference: 'events',
        data: { eventId: event._id.toString(), slug: event.slug, eventSlug: event.slug },
      })),
    );
  }

  private toBoolean(value: unknown, defaultValue = false): boolean {
    if (value === undefined || value === null || value === '') return defaultValue;
    return value === true || value === 'true';
  }

  private parseAccommodationOptions(value: unknown): any[] {
    if (!value) return [];

    let options: unknown;
    try {
      options = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      throw new BadRequestException('Accommodation options must be valid JSON');
    }

    if (!Array.isArray(options)) {
      throw new BadRequestException('Accommodation options must be an array');
    }

    const ids = new Set<string>();
    return options.map((rawOption: any, index) => {
      const id = String(rawOption?.id || '').trim();
      const name = String(rawOption?.name || '').trim();
      const description = String(rawOption?.description || '').trim();
      const isPriced = rawOption?.isPriced === true || rawOption?.isPriced === 'true';
      const priceNgn =
        rawOption?.priceNgn === '' || rawOption?.priceNgn == null
          ? undefined
          : Number(rawOption.priceNgn);
      const priceUsd =
        rawOption?.priceUsd === '' || rawOption?.priceUsd == null
          ? undefined
          : Number(rawOption.priceUsd);

      if (!id || !name) {
        throw new BadRequestException(`Accommodation option ${index + 1} requires an id and name`);
      }
      if (ids.has(id)) {
        throw new BadRequestException(`Accommodation option id "${id}" is duplicated`);
      }
      if (
        (priceNgn !== undefined && (!Number.isFinite(priceNgn) || priceNgn < 0)) ||
        (priceUsd !== undefined && (!Number.isFinite(priceUsd) || priceUsd < 0))
      ) {
        throw new BadRequestException(`Accommodation option "${name}" has an invalid price`);
      }
      if (isPriced && priceNgn === undefined && priceUsd === undefined) {
        throw new BadRequestException(
          `Price-tagged accommodation option "${name}" needs an NGN or USD price`,
        );
      }

      ids.add(id);
      return {
        id,
        name,
        description: description || undefined,
        isPriced,
        priceNgn: isPriced ? priceNgn : undefined,
        priceUsd: isPriced ? priceUsd : undefined,
      };
    });
  }

  private parseRegistrationFields(value: unknown): any[] {
    if (!value) return [];

    let fields: unknown;
    try {
      fields = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      throw new BadRequestException('Registration fields must be valid JSON');
    }

    if (!Array.isArray(fields)) {
      throw new BadRequestException('Registration fields must be an array');
    }
    if (fields.length > 30) {
      throw new BadRequestException('A conference can have at most 30 custom fields');
    }

    const allowedTypes = new Set([
      'shortText',
      'longText',
      'email',
      'phone',
      'number',
      'date',
      'select',
      'radio',
      'checkbox',
    ]);
    const ids = new Set<string>();

    return fields.map((rawField: any, index) => {
      const id = String(rawField?.id || '').trim();
      const label = String(rawField?.label || '').trim();
      const type = String(rawField?.type || '').trim();
      const options = Array.isArray(rawField?.options)
        ? rawField.options.map((option: unknown) => String(option).trim()).filter(Boolean)
        : [];

      if (!id || !label) {
        throw new BadRequestException(`Registration field ${index + 1} needs an id and label`);
      }
      if (ids.has(id)) {
        throw new BadRequestException(`Registration field id "${id}" is duplicated`);
      }
      if (!allowedTypes.has(type)) {
        throw new BadRequestException(`Registration field "${label}" has an unsupported type`);
      }
      if ((type === 'select' || type === 'radio') && options.length < 2) {
        throw new BadRequestException(`Registration field "${label}" needs at least two options`);
      }

      ids.add(id);
      return {
        id,
        label,
        type,
        required: this.toBoolean(rawField?.required),
        placeholder: String(rawField?.placeholder || '').trim() || undefined,
        helpText: String(rawField?.helpText || '').trim() || undefined,
        options,
      };
    });
  }

  private validateRegistrationResponses(
    event: any,
    responses: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    const fields = event.registrationFields || [];
    const supplied = responses || {};
    const allowedIds = new Set(fields.map((field: any) => field.id));
    const unknownField = Object.keys(supplied).find((id) => !allowedIds.has(id));
    if (unknownField) {
      throw new BadRequestException('The registration form contains an unknown field');
    }

    const normalized: Record<string, unknown> = {};
    for (const field of fields) {
      const rawValue = supplied[field.id];
      const isEmpty =
        rawValue === undefined ||
        rawValue === null ||
        rawValue === '' ||
        (typeof rawValue === 'string' && rawValue.trim() === '');

      if (field.required && (isEmpty || (field.type === 'checkbox' && rawValue !== true))) {
        throw new BadRequestException(`${field.label} is required`);
      }
      if (isEmpty) continue;

      switch (field.type) {
        case 'shortText':
        case 'phone': {
          const value = String(rawValue).trim();
          if (value.length > 500) throw new BadRequestException(`${field.label} is too long`);
          normalized[field.id] = value;
          break;
        }
        case 'longText': {
          const value = String(rawValue).trim();
          if (value.length > 5000) throw new BadRequestException(`${field.label} is too long`);
          normalized[field.id] = value;
          break;
        }
        case 'email': {
          const value = String(rawValue).trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            throw new BadRequestException(`${field.label} must be a valid email address`);
          }
          normalized[field.id] = value;
          break;
        }
        case 'number': {
          const value = Number(rawValue);
          if (!Number.isFinite(value)) {
            throw new BadRequestException(`${field.label} must be a number`);
          }
          normalized[field.id] = value;
          break;
        }
        case 'date': {
          const value = String(rawValue);
          if (Number.isNaN(new Date(value).getTime())) {
            throw new BadRequestException(`${field.label} must be a valid date`);
          }
          normalized[field.id] = value;
          break;
        }
        case 'select':
        case 'radio': {
          const value = String(rawValue);
          if (!(field.options || []).includes(value)) {
            throw new BadRequestException(`${field.label} has an invalid selection`);
          }
          normalized[field.id] = value;
          break;
        }
        case 'checkbox':
          if (typeof rawValue !== 'boolean') {
            throw new BadRequestException(`${field.label} must be checked or unchecked`);
          }
          normalized[field.id] = rawValue;
          break;
      }
    }

    return normalized;
  }

  private resolveAccommodationSelection(
    event: any,
    accommodationOptionId: string | undefined,
    userRole: string,
  ): AccommodationSelection | undefined {
    const options = event.accommodationOptions || [];
    if (!accommodationOptionId) {
      if (event.accommodationSelectionRequired && options.length > 0) {
        throw new BadRequestException('Please select an accommodation option');
      }
      return undefined;
    }

    const option = options.find((item: any) => item.id === accommodationOptionId);
    if (!option) {
      throw new BadRequestException('The selected accommodation option is unavailable');
    }

    const currency = userRole === UserRole.GLOBALNETWORK ? 'USD' : 'NGN';
    const configuredPrice = currency === 'USD' ? option.priceUsd : option.priceNgn;
    if (option.isPriced && configuredPrice == null) {
      throw new BadRequestException(
        `${option.name} does not have a ${currency} price for your account`,
      );
    }

    return {
      optionId: option.id,
      name: option.name,
      description: option.description,
      price: option.isPriced ? Number(configuredPrice) : 0,
      currency,
    };
  }

  async create(
    createEventDto: CreateEventDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    try {
      const isConference = this.toBoolean(createEventDto.isConference);
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

      // Prepare conference configuration if this is a conference
      let conferenceConfig = undefined;
      if (isConference) {
        conferenceConfig = {
          conferenceType: createEventDto.conferenceType,
          zone: createEventDto.conferenceZone,
          region: createEventDto.conferenceRegion,
          regularRegistrationEndDate: createEventDto.regularRegistrationEndDate,
          lateRegistrationEndDate: createEventDto.lateRegistrationEndDate,
          paystackSplitCode: createEventDto.paystackSplitCode,
          usePayPalForGlobal: createEventDto.usePayPalForGlobal,
        };
      }

      // Prepare virtual meeting info if provided
      let virtualMeetingInfo = undefined;
      if (createEventDto.virtualMeetingPlatform || createEventDto.virtualMeetingLink) {
        virtualMeetingInfo = {
          platform: createEventDto.virtualMeetingPlatform,
          meetingLink: createEventDto.virtualMeetingLink,
          meetingId: createEventDto.virtualMeetingId,
          passcode: createEventDto.virtualMeetingPasscode,
          dialInNumbers: createEventDto.virtualMeetingDialIn,
          additionalInstructions: createEventDto.virtualMeetingInstructions,
        };
      }

      const event = await this.eventModel.create({
        ...createEventDto,
        paymentPlans: createEventDto.paymentPlans ? JSON.parse(createEventDto.paymentPlans) : [],
        accommodationOptions: isConference
          ? this.parseAccommodationOptions(createEventDto.accommodationOptions)
          : [],
        accommodationSelectionRequired:
          isConference && this.toBoolean(createEventDto.accommodationSelectionRequired),
        registrationFields: isConference
          ? this.parseRegistrationFields(createEventDto.registrationFields)
          : [],
        membersGroup: !createEventDto.membersGroup.length
          ? AllEventAudiences
          : createEventDto.membersGroup,
        featuredImageCloudId,
        featuredImageUrl,
        registeredUsers: [],
        isConference,
        conferenceConfig,
        requiresSubscription: this.toBoolean(createEventDto.requiresSubscription, true),
        virtualMeetingInfo,
      });
      if (this.notificationDispatcher) void this.notifyEventAudience(event, 'created');

      return {
        success: true,
        message: `${isConference ? 'Conference' : 'Event'} created successfully`,
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
    const {
      searchBy,
      limit,
      page,
      eventType,
      membersGroup,
      eventDate,
      fromToday,
      fromDate,
      toDate,
    } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const searchCriteria: any = {};
    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(escapeRegex(searchBy), 'i') },
        { eventType: new RegExp(escapeRegex(searchBy), 'i') },
        { linkOrLocation: new RegExp(escapeRegex(searchBy), 'i') },
        { externalUrl: new RegExp(escapeRegex(searchBy), 'i') },
        { eventDateTime: new RegExp(escapeRegex(searchBy), 'i') },
      ];
    }
    if (eventType) searchCriteria.eventType = eventType;
    if (membersGroup) searchCriteria.membersGroup = membersGroup;

    const hasDateRange = Boolean(fromDate || toDate);
    if (hasDateRange && (!fromDate || !toDate)) {
      throw new BadRequestException('Both fromDate and toDate are required for a date range');
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    const dateFilterCount = [Boolean(eventDate), String(fromToday) === 'true', hasDateRange].filter(
      Boolean,
    ).length;
    if (dateFilterCount > 1) {
      throw new BadRequestException('Please use only one event date filter');
    }

    if (eventDate) {
      const startOfDay = new Date(`${eventDate}T00:00:00+01:00`);
      const endOfDay = new Date(`${eventDate}T23:59:59+01:00`);
      searchCriteria.eventDateTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (fromDate && toDate) {
      const rangeStart = new Date(`${fromDate}T00:00:00+01:00`);
      const rangeEnd = new Date(`${toDate}T23:59:59+01:00`);
      searchCriteria.eventDateTime = { $gte: rangeStart, $lte: rangeEnd };
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

  // Get payment plans for a specific event based on user's role and experience
  async getUserPaymentPlans(slug: string, userId: string): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user can see this event
    if (!this.usersService.canUserSeeConference(user, event.membersGroup)) {
      throw new BadRequestException('You do not have access to this event');
    }

    // Get user's relevant member group
    const userMemberGroup = this.usersService.getUserMemberGroup(user);

    // Filter payment plans for the user's member group
    const userPaymentPlans = (event.paymentPlans || []).filter(
      (plan: any) => plan.role === userMemberGroup,
    );

    // Calculate payment breakdown including fees if applicable
    let paymentBreakdown = null;
    if (event.isPaid && userPaymentPlans.length > 0) {
      // For conferences, use current registration period
      let currentRegistrationPeriod = 'Regular';
      if (event.isConference && event.conferenceConfig) {
        const now = new Date();
        const regularEndDate = new Date(event.conferenceConfig.regularRegistrationEndDate);
        const lateEndDate = new Date(event.conferenceConfig.lateRegistrationEndDate);

        if (now > regularEndDate && now <= lateEndDate) {
          currentRegistrationPeriod = 'Late';
        } else if (now > lateEndDate) {
          currentRegistrationPeriod = 'Closed';
        }
      }

      paymentBreakdown = this.getConferencePaymentBreakdown(
        event,
        userMemberGroup,
        currentRegistrationPeriod as RegistrationPeriod,
      );
    }

    // If this is a conference, include registration period information
    let registrationInfo = null;
    if (event.isConference && event.conferenceConfig) {
      const now = new Date();
      const regularEndDate = new Date(event.conferenceConfig.regularRegistrationEndDate);
      const lateEndDate = new Date(event.conferenceConfig.lateRegistrationEndDate);

      let currentPeriod = 'Regular';
      if (now > regularEndDate && now <= lateEndDate) {
        currentPeriod = 'Late';
      } else if (now > lateEndDate) {
        currentPeriod = 'Closed';
      }

      registrationInfo = {
        currentPeriod,
        regularEndDate: event.conferenceConfig.regularRegistrationEndDate,
        lateEndDate: event.conferenceConfig.lateRegistrationEndDate,
        isRegistrationOpen: now <= lateEndDate,
      };
    }

    return {
      success: true,
      message: 'Payment plans fetched successfully',
      data: {
        paymentPlans: userPaymentPlans,
        userMemberGroup,
        registrationInfo,
        paymentBreakdown,
        eventInfo: {
          name: event.name,
          slug: event.slug,
          isConference: event.isConference,
          isPaid: event.isPaid,
        },
      },
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
                registrationPeriod: '$$regUser.registrationPeriod',
                accommodation: '$$regUser.accommodation',
                customResponses: '$$regUser.customResponses',
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
    const updates: any = {
      ...updateEventDto,
      featuredImageCloudId,
      featuredImageUrl,
    };

    if (updateEventDto.paymentPlans !== undefined) {
      updates.paymentPlans =
        typeof updateEventDto.paymentPlans === 'string'
          ? JSON.parse(updateEventDto.paymentPlans)
          : updateEventDto.paymentPlans;
    }
    if (updateEventDto.accommodationOptions !== undefined) {
      updates.accommodationOptions = this.parseAccommodationOptions(
        updateEventDto.accommodationOptions,
      );
    }
    if (updateEventDto.registrationFields !== undefined) {
      updates.registrationFields = this.parseRegistrationFields(updateEventDto.registrationFields);
    }

    const conferenceConfigFields = [
      'conferenceType',
      'conferenceZone',
      'conferenceRegion',
      'regularRegistrationEndDate',
      'lateRegistrationEndDate',
      'paystackSplitCode',
      'usePayPalForGlobal',
    ];
    if (conferenceConfigFields.some((field) => updateEventDto[field] !== undefined)) {
      updates.conferenceConfig = {
        ...((event.conferenceConfig as any)?.toObject?.() || event.conferenceConfig || {}),
        ...(updateEventDto.conferenceType !== undefined
          ? { conferenceType: updateEventDto.conferenceType }
          : {}),
        ...(updateEventDto.conferenceZone !== undefined
          ? { zone: updateEventDto.conferenceZone }
          : {}),
        ...(updateEventDto.conferenceRegion !== undefined
          ? { region: updateEventDto.conferenceRegion }
          : {}),
        ...(updateEventDto.regularRegistrationEndDate !== undefined
          ? { regularRegistrationEndDate: updateEventDto.regularRegistrationEndDate }
          : {}),
        ...(updateEventDto.lateRegistrationEndDate !== undefined
          ? { lateRegistrationEndDate: updateEventDto.lateRegistrationEndDate }
          : {}),
        ...(updateEventDto.paystackSplitCode !== undefined
          ? { paystackSplitCode: updateEventDto.paystackSplitCode }
          : {}),
        ...(updateEventDto.usePayPalForGlobal !== undefined
          ? { usePayPalForGlobal: updateEventDto.usePayPalForGlobal }
          : {}),
      };
      conferenceConfigFields.forEach((field) => delete updates[field]);
    }

    const newEvent = await this.eventModel.findOneAndUpdate({ slug }, updates, { new: true });
    if (this.notificationDispatcher) void this.notifyEventAudience(newEvent, 'updated');

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

  async payForEvent(
    userId: string,
    slug: string,
    accommodationOptionId?: string,
    customResponses?: Record<string, unknown>,
  ): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug }).lean();

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    const user = await this.userModel.findById(userId);

    // Check if user has an active subscription (only if event requires it)
    if (event.requiresSubscription && !user.subscribed) {
      throw new ForbiddenException(
        'You must have an active subscription to register for this event. Please subscribe first.',
      );
    }

    // Check if user is already registered
    const isRegistered = event.registeredUsers.some(
      (registration: any) => registration.userId?.toString() === userId,
    );
    if (isRegistered) {
      throw new ConflictException('User is already registered for this event');
    }

    let transaction: any;

    // Determine current registration period for conferences
    const currentRegistrationPeriod = this.getCurrentRegistrationPeriod(event);

    const accommodation = this.resolveAccommodationSelection(
      event,
      accommodationOptionId,
      user.role,
    );
    const normalizedResponses = this.validateRegistrationResponses(event, customResponses);

    const registrationDraft = await this.registrationDraftModel.findOneAndUpdate(
      { eventId: event._id, userId: user._id },
      {
        $set: {
          accommodation,
          customResponses: normalizedResponses,
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const userMemberGroup = this.usersService.getUserExperienceCategory(user);

    // Find the appropriate payment plan based on role and registration period
    const amount = this.getEventPaymentAmount(
      event,
      userMemberGroup,
      currentRegistrationPeriod,
      accommodation?.price || 0,
    );

    if (amount <= 0) {
      throw new BadRequestException('This registration does not require online payment');
    }
    void this.notificationDispatcher?.notifyMany(
      (event.registeredUsers || []).map((registration: any) => ({
        userId: registration.userId.toString(),
        type: NotificationType.EVENT,
        title: 'Event cancelled',
        body: `${event.name} has been cancelled.`,
        idempotencyKey: `event:${event._id}:cancelled`,
        preference: 'events',
        data: { eventId: event._id.toString(), slug: event.slug, eventSlug: event.slug },
      })),
    );

    if (user.role === UserRole.GLOBALNETWORK) {
      // Check if conference is configured to use PayPal for global network
      const usePayPal = event.isConference && event.conferenceConfig?.usePayPalForGlobal;

      if (usePayPal) {
        transaction = await this.paypalService.createOrder({
          amount,
          currency: 'USD',
          description: event.isConference ? 'CONFERENCE' : 'EVENT',
          metadata: JSON.stringify({
            eventId: event._id,
            slug: event.slug,
            userId,
            registrationPeriod: currentRegistrationPeriod,
            registrationDraftId: registrationDraft._id,
          }),
          items: [
            {
              name: `${event.isConference ? 'CONFERENCE' : 'EVENT'} - ${event.name}`,
              quantity: 1,
              amount,
            },
          ],
        });
      }
    }

    if (!transaction) {
      // Use Paystack for local payments or fallback
      // Ensure amount is properly rounded to avoid floating point precision issues
      const amountInKobo = Math.round(amount * 100);

      const paystackConfig: any = {
        amount: amountInKobo,
        email: user.email,
        currency: user.role === UserRole.GLOBALNETWORK ? 'USD' : 'NGN',
        callback_url: this.configService.get('EVENT_PAYMENT_SUCCESS_URL').replace('[slug]', slug),
        metadata: JSON.stringify({
          desc: event.isConference ? 'CONFERENCE' : 'EVENT',
          slug,
          userId,
          name: user.fullName,
          registrationPeriod: currentRegistrationPeriod,
          registrationDraftId: registrationDraft._id,
        }),
      };

      // Add split code for conferences if configured
      if (event.isConference && event.conferenceConfig?.paystackSplitCode) {
        paystackConfig.split_code = event.conferenceConfig.paystackSplitCode;
      }

      transaction = await this.paystackService.initializeTransaction(paystackConfig);
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
    }

    return {
      success: true,
      message: `${event.isConference ? 'Conference' : 'Event'} payment session initiated`,
      data:
        user.role === UserRole.GLOBALNETWORK && event.conferenceConfig?.usePayPalForGlobal
          ? transaction
          : { checkout_url: transaction.data.authorization_url },
    };
  }
  private getCurrentRegistrationPeriod(event: any): RegistrationPeriod {
    if (!event.isConference || !event.conferenceConfig) {
      return RegistrationPeriod.REGULAR;
    }

    const now = new Date();
    const regularEnd = event.conferenceConfig.regularRegistrationEndDate
      ? new Date(event.conferenceConfig.regularRegistrationEndDate)
      : null;
    const lateEnd = event.conferenceConfig.lateRegistrationEndDate
      ? new Date(event.conferenceConfig.lateRegistrationEndDate)
      : null;
    const eventDate = new Date(event.eventDateTime);

    // Convert all dates to UTC for comparison
    const nowUTC = new Date(now.toISOString());
    const regularEndUTC = regularEnd ? new Date(regularEnd.toISOString()) : null;
    const lateEndUTC = lateEnd ? new Date(lateEnd.toISOString()) : null;
    const eventDateUTC = new Date(eventDate.toISOString());

    // If no registration dates are set, allow registration until event date
    if (!regularEndUTC && !lateEndUTC) {
      const registrationCutoff = new Date(eventDateUTC.getTime() - 24 * 60 * 60 * 1000);
      if (nowUTC <= registrationCutoff) {
        return RegistrationPeriod.REGULAR;
      } else {
        throw new BadRequestException('Registration period has ended');
      }
    }

    if (regularEndUTC && nowUTC <= regularEndUTC) {
      return RegistrationPeriod.REGULAR;
    } else if (lateEndUTC && nowUTC <= lateEndUTC) {
      return RegistrationPeriod.LATE;
    } else {
      throw new BadRequestException('Registration period has ended');
    }
  }
  // Safe version that doesn't throw errors - for public views
  private getRegistrationPeriodStatus(event: any): 'regular' | 'late' | 'closed' {
    if (!event.isConference || !event.conferenceConfig) {
      return 'regular';
    }

    const now = new Date();
    const regularEnd = event.conferenceConfig.regularRegistrationEndDate;
    const lateEnd = event.conferenceConfig.lateRegistrationEndDate;
    const eventDate = new Date(event.eventDateTime);

    // If no registration dates are set, allow registration until event date
    if (!regularEnd && !lateEnd) {
      // Allow registration up to 24 hours before the event
      const registrationCutoff = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
      if (now <= registrationCutoff) {
        return 'regular';
      } else {
        return 'closed';
      }
    }

    if (regularEnd && now <= regularEnd) {
      return 'regular';
    } else if (lateEnd && now <= lateEnd) {
      return 'late';
    } else {
      return 'closed';
    }
  }

  // Debug method to check registration status with detailed info
  async checkRegistrationStatus(slug: string): Promise<any> {
    const event = await this.eventModel.findOne({ slug }).lean();
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const now = new Date();
    const eventDate = new Date(event.eventDateTime);
    const regularEnd = event.conferenceConfig?.regularRegistrationEndDate;
    const lateEnd = event.conferenceConfig?.lateRegistrationEndDate;

    return {
      currentTime: now.toISOString(),
      eventDateTime: eventDate.toISOString(),
      regularRegistrationEndDate: regularEnd?.toISOString() || 'Not set',
      lateRegistrationEndDate: lateEnd?.toISOString() || 'Not set',
      isConference: event.isConference,
      hasConferenceConfig: !!event.conferenceConfig,
      registrationStatus: this.getRegistrationPeriodStatus(event),
      timeUntilEvent: Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }
  private getEventPaymentAmount(
    event: any,
    userRole: string,
    registrationPeriod: RegistrationPeriod,
    accommodationPrice = 0,
  ): number {
    let baseAmount = 0;

    // For conferences, find payment plan by role and registration period
    if (event.isConference) {
      const plan = event.paymentPlans.find(
        (p: any) =>
          p.role === userRole &&
          (p.registrationPeriod === registrationPeriod || !p.registrationPeriod),
      );
      if (plan) {
        baseAmount = plan.price;
      }
    } else {
      // Fallback to regular event payment plan
      const plan = event.paymentPlans.find((p: any) => p.role === userRole);
      baseAmount = plan ? plan.price : 0;
    }

    baseAmount += accommodationPrice;

    // If no amount found, return 0
    if (baseAmount <= 0) {
      return 0;
    }

    // For conferences with split codes (using Paystack), calculate amount including fees
    // so that after Paystack deducts fees, the organization receives the base amount
    if (
      event.isConference &&
      event.conferenceConfig?.paystackSplitCode &&
      userRole !== UserRole.GLOBALNETWORK
    ) {
      try {
        // Calculate the amount to charge user so that after Paystack fees,
        // the organization receives the exact base amount
        const chargeAmount = PaystackFeeCalculator.calculateChargeAmount(baseAmount);

        return chargeAmount;
      } catch (error) {
        console.error('Error calculating Paystack fees:', error);
        // Fallback to base amount if calculation fails
        return baseAmount;
      }
    }

    // For PayPal payments (GlobalNetwork) or events without split codes, return base amount
    return baseAmount;
  }

  /**
   * Get detailed payment breakdown for a conference including fees
   * This is useful for displaying to users what they'll pay vs what the organization receives
   */
  getConferencePaymentBreakdown(
    event: any,
    userRole: string,
    registrationPeriod: RegistrationPeriod,
  ): {
    baseAmount: number;
    chargeAmount: number;
    includesFees: boolean;
    feeBreakdown?: {
      percentageFee: number;
      fixedFee: number;
      totalFees: number;
    };
    currency: string;
    paymentMethod: string;
  } {
    let baseAmount = 0;

    // Find the base payment plan
    if (event.isConference) {
      const plan = event.paymentPlans.find(
        (p: any) =>
          p.role === userRole &&
          (p.registrationPeriod === registrationPeriod || !p.registrationPeriod),
      );
      if (plan) {
        baseAmount = plan.price;
      }
    } else {
      const plan = event.paymentPlans.find((p: any) => p.role === userRole);
      baseAmount = plan ? plan.price : 0;
    }

    // Determine payment method and currency
    const isGlobalNetwork = userRole === UserRole.GLOBALNETWORK;
    const usePayPal = isGlobalNetwork && event.conferenceConfig?.usePayPalForGlobal;
    const currency = isGlobalNetwork ? 'USD' : 'NGN';
    const paymentMethod = usePayPal ? 'PayPal' : 'Paystack';

    // Calculate fees for Paystack payments with split codes
    const shouldIncludeFees =
      event.isConference && event.conferenceConfig?.paystackSplitCode && !isGlobalNetwork;

    if (shouldIncludeFees && baseAmount > 0) {
      try {
        const chargeAmount = PaystackFeeCalculator.calculateChargeAmount(baseAmount);
        const fees = PaystackFeeCalculator.calculateFees(chargeAmount);

        return {
          baseAmount,
          chargeAmount,
          includesFees: true,
          feeBreakdown: {
            percentageFee: fees.percentageFee,
            fixedFee: fees.fixedFee,
            totalFees: fees.totalFees,
          },
          currency,
          paymentMethod,
        };
      } catch (error) {
        console.error('Error calculating fee breakdown:', error);
      }
    }

    // Return base amount without fees
    return {
      baseAmount,
      chargeAmount: baseAmount,
      includesFees: false,
      currency,
      paymentMethod,
    };
  }

  async registerForEvent(
    userId: string, // Accept userId as a string
    slug: string,
    reference?: string,
    accommodationOptionId?: string,
    confirmedAccommodation?: AccommodationSelection,
    customResponses?: Record<string, unknown>,
  ): Promise<ISuccessResponse> {
    const event = await this.eventModel.findOne({ slug });

    if (!event) {
      throw new NotFoundException('No event with such slug');
    }

    const user = await this.userModel.findById(userId);

    const accommodation =
      confirmedAccommodation ||
      this.resolveAccommodationSelection(event, accommodationOptionId, user.role);
    const normalizedResponses = this.validateRegistrationResponses(event, customResponses);

    // Check if user has an active subscription (only if event requires it)
    if (event.requiresSubscription && !user.subscribed) {
      throw new ForbiddenException(
        'You must have an active subscription to register for this event. Please subscribe first.',
      );
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

    if ((event.isPaid || (accommodation?.price || 0) > 0) && !reference) {
      throw new BadRequestException('Payment reference is required for paid events');
    }

    // For conferences, track the registration period
    const registrationPeriod = event.isConference
      ? this.getCurrentRegistrationPeriod(event)
      : undefined;
    event.registeredUsers.push({
      userId: userObjectId,
      paymentReference: reference,
      registrationPeriod,
      accommodation,
      customResponses: normalizedResponses,
    });
    await event.save();
    void this.notificationDispatcher?.notify({
      userId,
      type: NotificationType.EVENT,
      title: 'Registration confirmed',
      body: `You are registered for ${event.name}.`,
      idempotencyKey: `event:${event._id}:registration:${userId}`,
      preference: 'events',
      data: { eventId: event._id.toString(), slug: event.slug, eventSlug: event.slug },
    });

    // Send registration confirmation email for conferences when the member allows it.
    if (
      event.isConference &&
      (user as any).notificationPreferences?.emailNotifications !== false &&
      (user as any).notificationPreferences?.events !== false
    ) {
      try {
        const user = await this.userModel.findById(userId);
        if (user) {
          await this.emailService.sendConferenceRegistrationConfirmationEmail({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            conferenceName: event.name,
            conferenceType:
              event.conferenceConfig?.conferenceType || event.conferenceConfig?.type || 'General',
            conferenceScope: this.getConferenceScope(event),
            conferenceDate: this.formatDate(event.eventDateTime),
            conferenceVenue: event.linkOrLocation,
            registrationPeriod: registrationPeriod || 'Regular',
            conferenceUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/conferences/${event.slug}`,
          });
        }
      } catch (emailError) {
        // Log email error but don't fail the registration
        console.error('Failed to send conference registration email:', emailError);
      }
    }

    return {
      success: true,
      message: `Successfully registered for the ${event.isConference ? 'conference' : 'event'}`,
      data: event,
    };
  }

  // New method to find conferences for a specific user based on their role and experience
  async findConferencesForUser(
    userId: string,
    query: EventPaginationQueryDto & {
      conferenceType?: ConferenceType;
      zone?: ConferenceZone;
      region?: ConferenceRegion;
    },
  ): Promise<ISuccessResponse> {
    // Get user to determine their event audience
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { searchBy, limit, page, eventType, eventDate, fromToday, conferenceType, zone, region } =
      query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Get all conferences first
    const allConferences = await this.eventModel.find({ isConference: true });

    // Filter conferences based on user visibility using the helper method
    const visibleConferences = allConferences.filter((conference) =>
      this.usersService.canUserSeeConference(user, conference.membersGroup),
    );

    // Extract conference IDs for the main query
    const visibleConferenceIds = visibleConferences.map((conf) => conf._id);

    const searchCriteria: any = {
      isConference: true,
      _id: { $in: visibleConferenceIds },
    };

    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(escapeRegex(searchBy), 'i') },
        { eventType: new RegExp(escapeRegex(searchBy), 'i') },
        { linkOrLocation: new RegExp(escapeRegex(searchBy), 'i') },
        { eventDateTime: new RegExp(escapeRegex(searchBy), 'i') },
      ];
    }

    if (eventType) searchCriteria.eventType = eventType;
    if (conferenceType) searchCriteria['conferenceConfig.conferenceType'] = conferenceType;
    if (zone) searchCriteria['conferenceConfig.zone'] = zone;
    if (region) searchCriteria['conferenceConfig.region'] = region;

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

    const conferences = await this.eventModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    // Add user-specific information to each conference
    const conferencesWithUserInfo = conferences.map((conference) => {
      const conferenceObj = conference.toObject() as any;

      // Check if user is registered
      conferenceObj.isRegistered = conference.registeredUsers.some(
        (registeredUser: any) => registeredUser.userId.toString() === userId,
      );

      // Get user's payment plan
      conferenceObj.userPaymentPlan = (conference as any).getPaymentPlanForUser(
        user.role,
        user.yearsOfExperience,
      );

      return conferenceObj;
    });

    const totalItems = await this.eventModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'User conferences fetched successfully',
      data: {
        items: conferencesWithUserInfo,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
        userInfo: {
          role: user.role,
          eventAudience: this.usersService.getUserExperienceCategory(user),
          yearsOfExperience: user.yearsOfExperience,
        },
      },
    };
  }

  // Keep existing findConferences method for admin use
  async findConferences(
    query: EventPaginationQueryDto & {
      conferenceType?: ConferenceType;
      zone?: ConferenceZone;
      region?: ConferenceRegion;
    },
  ): Promise<ISuccessResponse> {
    const {
      searchBy,
      limit,
      page,
      eventType,
      membersGroup,
      eventDate,
      fromToday,
      conferenceType,
      zone,
      region,
    } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const searchCriteria: any = { isConference: true };

    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(escapeRegex(searchBy), 'i') },
        { eventType: new RegExp(escapeRegex(searchBy), 'i') },
        { linkOrLocation: new RegExp(escapeRegex(searchBy), 'i') },
        { eventDateTime: new RegExp(escapeRegex(searchBy), 'i') },
      ];
    }

    if (eventType) searchCriteria.eventType = eventType;
    if (membersGroup) searchCriteria.membersGroup = membersGroup;
    if (conferenceType) searchCriteria['conferenceConfig.conferenceType'] = conferenceType;
    if (zone) searchCriteria['conferenceConfig.zone'] = zone;
    if (region) searchCriteria['conferenceConfig.region'] = region;

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

    const conferences = await this.eventModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.eventModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Conferences fetched successfully',
      data: {
        items: conferences,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }
  // Public method to find conferences (no authentication required)
  async findPublicConferences(
    query: EventPaginationQueryDto & {
      conferenceType?: ConferenceType;
      zone?: ConferenceZone;
      region?: ConferenceRegion;
    },
  ): Promise<ISuccessResponse> {
    const {
      searchBy,
      limit,
      page,
      eventType,
      membersGroup,
      eventDate,
      conferenceType,
      zone,
      region,
    } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria: any = {
      isConference: true,
      // Temporarily show all conferences for debugging (remove this line later)
      // eventDateTime: { $gte: new Date() },
    };

    if (searchBy) {
      searchCriteria.$or = [
        { name: new RegExp(escapeRegex(searchBy), 'i') },
        { eventType: new RegExp(escapeRegex(searchBy), 'i') },
        { linkOrLocation: new RegExp(escapeRegex(searchBy), 'i') },
      ];
    }

    if (eventType) searchCriteria.eventType = eventType;
    if (membersGroup) searchCriteria.membersGroup = membersGroup;
    if (conferenceType) searchCriteria['conferenceConfig.conferenceType'] = conferenceType;
    if (zone) searchCriteria['conferenceConfig.zone'] = zone;
    if (region) searchCriteria['conferenceConfig.region'] = region;

    if (eventDate) {
      const startOfDay = new Date(`${eventDate}T00:00:00+01:00`);
      const endOfDay = new Date(`${eventDate}T23:59:59+01:00`);
      searchCriteria.eventDateTime = { $gte: startOfDay, $lte: endOfDay };
    }
    const conferences = await this.eventModel
      .find(searchCriteria)
      // Select only public fields
      .select(
        'name description featuredImageUrl eventType linkOrLocation eventDateTime membersGroup isPaid paymentPlans conferenceConfig accommodationOptions accommodationSelectionRequired registrationFields slug createdAt',
      )
      .sort({ eventDateTime: 1 }) // Sort by event date (upcoming first)
      .limit(perPage)
      .skip(perPage * (currentPage - 1)); // Add registration status to each conference
    const conferencesWithStatus = conferences.map((conference) => {
      const conferenceObj = conference.toObject() as EventWithRegistrationStatus;
      conferenceObj.registrationStatus = this.getRegistrationPeriodStatus(conferenceObj);
      return conferenceObj;
    });

    const totalItems = await this.eventModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Public conferences fetched successfully',
      data: {
        items: conferencesWithStatus,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async checkUserExists(email: string): Promise<ISuccessResponse> {
    return {
      success: true,
      message: 'User check completed',
      data: {
        exists: false,
        user: null,
      },
    };
  }

  private getConferenceScope(event: Event): string {
    if (event.conferenceConfig?.zone) {
      return `${event.conferenceConfig.zone} Zone`;
    }
    if (event.conferenceConfig?.region) {
      return `${event.conferenceConfig.region} Region`;
    }
    return 'National';
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private formatCurrency(amount: number, currency = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  async confirmEventPayment(confirmEventPayDto: ConfirmEventPayDto): Promise<ISuccessResponse> {
    const { reference, source } = confirmEventPayDto;

    try {
      let paymentVerification: any;
      let eventData: any;
      if (source?.toLowerCase() === 'paypal') {
        // Verify PayPal payment
        paymentVerification = await this.paypalService.captureOrder(reference);
        if (!paymentVerification.status || paymentVerification.status !== 'COMPLETED') {
          throw new BadRequestException('Payment verification failed');
        } // Extract event data from PayPal custom metadata
        const customId = paymentVerification.purchase_units[0].custom_id || '{}';

        // Only parse if it's a string, otherwise use as is
        if (typeof customId === 'string') {
          try {
            const decodedCustomId = Buffer.from(customId, 'base64').toString('utf-8');
            eventData = JSON.parse(decodedCustomId);
          } catch (parseError) {
            try {
              eventData = JSON.parse(customId);
            } catch {
              console.error('Failed to parse PayPal custom ID:', parseError);
              throw new BadRequestException('Invalid PayPal metadata format');
            }
          }
        } else if (typeof customId === 'object') {
          // If it's already an object, use it directly
          eventData = customId;
        } else {
          console.error('PayPal custom ID is neither string nor object:', customId);
          throw new BadRequestException('Unexpected PayPal metadata format');
        }
      } else {
        // Verify Paystack payment
        paymentVerification = await this.paystackService.verifyTransaction(reference);
        if (!paymentVerification.status) {
          throw new BadRequestException('Payment verification failed');
        }

        // Only parse if it's a string, otherwise use as is
        if (typeof paymentVerification.data.metadata === 'string') {
          try {
            eventData = JSON.parse(paymentVerification.data.metadata);
          } catch (parseError) {
            console.error('Failed to parse metadata string:', parseError);
            throw new BadRequestException('Invalid metadata format');
          }
        } else if (typeof paymentVerification.data.metadata === 'object') {
          // If it's already an object, use it directly
          eventData = paymentVerification.data.metadata;
        } else {
          console.error(
            'Metadata is neither string nor object:',
            paymentVerification.data.metadata,
          );
          throw new BadRequestException('Unexpected metadata format');
        }
      }

      const {
        userId,
        slug,
        eventId,
        registrationPeriod,
        registrationDraftId,
        accommodationOptionId,
        accommodation,
      } = eventData;
      const event = slug
        ? await this.eventModel.findOne({ slug })
        : await this.eventModel.findById(eventId);

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      let registrationDraft: any = null;
      if (registrationDraftId) {
        registrationDraft = await this.registrationDraftModel
          .findOne({
            _id: registrationDraftId,
            eventId: event._id,
            userId: new mongoose.Types.ObjectId(userId),
          })
          .lean();
        if (!registrationDraft) {
          throw new BadRequestException(
            'Your registration form session expired. Please start registration again.',
          );
        }
      }

      // Register the user for the event
      await this.registerForEvent(
        userId,
        event.slug,
        reference,
        accommodationOptionId,
        (registrationDraft?.accommodation || accommodation) as AccommodationSelection,
        registrationDraft?.customResponses || {},
      );

      if (registrationDraftId) {
        await this.registrationDraftModel.deleteOne({ _id: registrationDraftId });
      }

      // Send payment confirmation email for conferences
      if (event.isConference) {
        try {
          const user = await this.userModel.findById(userId);
          if (user) {
            const amount = this.getEventPaymentAmount(
              event,
              this.usersService.getUserExperienceCategory(user),
              registrationPeriod || RegistrationPeriod.REGULAR,
              (registrationDraft?.accommodation?.price || accommodation?.price || 0) as number,
            );
            await this.emailService.sendConferencePaymentConfirmationEmail({
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              conferenceName: event.name,
              amountPaid: this.formatCurrency(
                amount,
                user.role === UserRole.GLOBALNETWORK ? 'USD' : 'NGN',
              ),
              registrationPeriod: registrationPeriod || 'Regular',
              paymentMethod: source?.toLowerCase() === 'paypal' ? 'PayPal' : 'Paystack',
              transactionId: reference,
              paymentDate: this.formatDate(new Date()),
              conferenceDate: this.formatDate(event.eventDateTime),
              conferenceVenue: event.linkOrLocation,
              conferenceType:
                event.conferenceConfig?.conferenceType || event.conferenceConfig?.type || 'General',
              conferenceScope: this.getConferenceScope(event),
              conferenceUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/conferences/${event.slug}`,
            });
          }
        } catch (emailError) {
          // Log email error but don't fail the payment confirmation
          console.error('Failed to send conference payment confirmation email:', emailError);
        }
      }

      return {
        success: true,
        message: `Payment confirmed and registered for ${event.isConference ? 'conference' : 'event'}`,
        data: { event, paymentVerification },
      };
    } catch (error) {
      throw new BadRequestException(`Payment confirmation failed: ${error.message}`);
    }
  }
  async findRegistered(userId: string, query: EventPaginationQueryDto): Promise<ISuccessResponse> {
    // Ensure page and limit are numbers, and support both 'search' and 'searchBy' for backward compatibility
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || query.searchBy;
    const skip = (page - 1) * limit;

    const searchQuery: any = {
      'registeredUsers.userId': new mongoose.Types.ObjectId(userId),
    };

    if (search) {
      searchQuery.name = { $regex: escapeRegex(search), $options: 'i' };
    }

    const events = await this.eventModel
      .find(searchQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const total = await this.eventModel.countDocuments(searchQuery);

    return {
      success: true,
      message: 'User registered events fetched successfully',
      data: {
        events,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      },
    };
  }

  async syncEventPaymentStatus(userId: string, reference: string): Promise<ISuccessResponse> {
    try {
      // Find event with this payment reference for this user
      const event = await this.eventModel.findOne({
        registeredUsers: {
          $elemMatch: {
            userId: new mongoose.Types.ObjectId(userId),
            paymentReference: reference,
          },
        },
      });

      if (!event) {
        throw new NotFoundException('Event registration with this payment reference not found');
      }

      // Find the specific registration
      const registration = event.registeredUsers.find(
        (reg) => reg.userId.toString() === userId && reg.paymentReference === reference,
      );

      if (!registration) {
        throw new NotFoundException('Registration not found');
      }

      // The registration exists, so we just need to verify the payment was successful
      // In the event model, having a paymentReference means the user registered for a paid event
      // If the reference exists, the payment should have been processed

      let paymentVerification: any;
      try {
        // Try to verify with Paystack first
        paymentVerification = await this.paystackService.verifyTransaction(reference);

        if (!paymentVerification.status) {
          // If Paystack fails, try PayPal for global network events
          if (event.conferenceConfig?.usePayPalForGlobal) {
            try {
              paymentVerification = await this.paypalService.captureOrder(reference);
              if (paymentVerification?.status !== 'COMPLETED') {
                throw new Error('Payment verification failed with both providers');
              }
            } catch (paypalError) {
              throw new Error('Payment verification failed with both providers');
            }
          } else {
            throw new Error('Payment verification failed - transaction not successful');
          }
        }
      } catch (error) {
        return {
          success: false,
          message: 'Payment verification failed - unable to verify with payment providers',
          data: null,
        };
      }

      // Payment is verified, send confirmation email if it's a conference
      if (event.isConference) {
        try {
          const user = await this.userModel.findById(userId);
          if (user) {
            const amount = this.getEventPaymentAmount(
              event,
              this.usersService.getUserExperienceCategory(user),
              registration.registrationPeriod || RegistrationPeriod.REGULAR,
              registration.accommodation?.price || 0,
            );
            await this.emailService.sendConferencePaymentConfirmationEmail({
              name: `${user.firstName} ${user.lastName}`,
              email: user.email,
              conferenceName: event.name,
              amountPaid: this.formatCurrency(
                amount,
                user.role === UserRole.GLOBALNETWORK ? 'USD' : 'NGN',
              ),
              registrationPeriod: registration.registrationPeriod || 'Regular',
              paymentMethod: paymentVerification.status === 'COMPLETED' ? 'PayPal' : 'Paystack',
              transactionId: reference,
              paymentDate: this.formatDate(new Date()),
              conferenceDate: this.formatDate(event.eventDateTime),
              conferenceVenue: event.linkOrLocation,
              conferenceType:
                event.conferenceConfig?.conferenceType || event.conferenceConfig?.type || 'General',
              conferenceScope: this.getConferenceScope(event),
              conferenceUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/conferences/${event.slug}`,
            });
          }
        } catch (emailError) {
          // Log email error but don't fail the sync
          console.error('Failed to send conference payment confirmation email:', emailError);
        }
      }

      return {
        success: true,
        message: `${event.isConference ? 'Conference' : 'Event'} payment status verified successfully`,
        data: {
          event: {
            name: event.name,
            slug: event.slug,
            isConference: event.isConference,
            eventDateTime: event.eventDateTime,
          },
          registration,
          paymentVerified: true,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
