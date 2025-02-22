import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from './schema/users.schema';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TransitionStatus, UserRole } from './user.constant';
import { json2csv } from 'json-2-csv';
import { UserSettings } from './schema/user-settings.schema';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';
import { UserTransition } from './schema/user-transition.schema';
import { CreateUserTransitionDto } from './dto/create-transition.dto';
import { EmailService } from '../email/email.service';
import { PipelineStage } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserSettings.name) private userSettingsModel: Model<UserSettings>,
    @InjectModel(UserTransition.name) private transitionModel: Model<UserTransition>,
    private cloudinaryService: CloudinaryService,
    private emailService: EmailService,
  ) {}

  async findAll(query: UserPaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, role, region } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria: any = {};
    if (searchBy) {
      const trimmedSearchBy = searchBy.trim();
      searchCriteria.$or = await [
        { firstName: { $regex: trimmedSearchBy, $options: 'i' } },
        { middleName: { $regex: trimmedSearchBy, $options: 'i' } },
        { lastName: { $regex: trimmedSearchBy, $options: 'i' } },
        { gender: { $regex: trimmedSearchBy, $options: 'i' } },
        { fullName: { $regex: trimmedSearchBy, $options: 'i' } },
        { email: { $regex: trimmedSearchBy, $options: 'i' } },
        { specialty: { $regex: trimmedSearchBy, $options: 'i' } },
        { licenseNumber: { $regex: trimmedSearchBy, $options: 'i' } },
        { membershipId: { $regex: trimmedSearchBy, $options: 'i' } },
      ];
    }
    if (role) searchCriteria.role = role;
    if (region) searchCriteria.region = region;

    const users = await this.userModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.userModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Users fetched successfully',
      data: {
        items: users,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async exportAll(query: UserPaginationQueryDto): Promise<any> {
    const { searchBy, role, region } = query;
    const searchCriteria: any = {};
    if (searchBy) {
      const trimmedSearchBy = searchBy.trim();
      searchCriteria.$or = await [
        { firstName: { $regex: trimmedSearchBy, $options: 'i' } },
        { middleName: { $regex: trimmedSearchBy, $options: 'i' } },
        { lastName: { $regex: trimmedSearchBy, $options: 'i' } },
        { gender: { $regex: trimmedSearchBy, $options: 'i' } },
        { fullName: { $regex: trimmedSearchBy, $options: 'i' } },
        { email: { $regex: trimmedSearchBy, $options: 'i' } },
        { specialty: { $regex: trimmedSearchBy, $options: 'i' } },
        { licenseNumber: { $regex: trimmedSearchBy, $options: 'i' } },
        { membershipId: { $regex: trimmedSearchBy, $options: 'i' } },
      ];
    }
    if (role) searchCriteria.role = role;
    if (region) searchCriteria.region = region;

    const pipeline: PipelineStage[] = [
      { $match: searchCriteria },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 0,
          MEMBER_ID: '$membershipId',
          FIRST_NAME: '$firstName',
          MIDDLE_NAME: '$middleName',
          LAST_NAME: '$lastName',
          GENDER: '$gender',
          EMAIL: '$email',
          PHONE: { $ifNull: ['$phone', '--'] },
          BIRTH_DATE: {
            $cond: {
              if: '$dateOfBirth',
              then: {
                $dateToString: { format: '%d-%b-%Y', date: '$dateOfBirth' },
              },
              else: '--',
            },
          },
          ROLE: '$role',
          REGION: '$region',
          SUBSCRIPTION: {
            $cond: { if: '$subscribed', then: 'Active', else: 'Inactive' },
          },
          DATE_JOINED: {
            $dateToString: { format: '%d-%b-%Y', date: '$createdAt' },
          },
        },
      },
    ];

    const users = await this.userModel.aggregate(pipeline);
    const csv = await json2csv(users);

    return csv;
  }

  async getStats(): Promise<ISuccessResponse> {
    const todayISO = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    const startOfToday = new Date(`${todayISO}T00:00:00.000Z`);
    const endOfToday = new Date(`${todayISO}T23:59:59.999Z`);

    const firstDayOfMonthISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const startOfMonth = new Date(`${firstDayOfMonthISO}T00:00:00.000Z`);
    const firstDayOfNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(`${firstDayOfNextMonth}T00:00:00.000Z`);

    const totalMembers = await this.userModel.countDocuments();
    const totalStudents = await this.userModel.countDocuments({ role: UserRole.STUDENT });
    const totalDoctors = await this.userModel.countDocuments({ role: UserRole.DOCTOR });
    const totalGlobalNetworks = await this.userModel.countDocuments({
      role: UserRole.GLOBALNETWORK,
    });

    // Users registered today
    const registeredToday = await this.userModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    // Users registered this month
    const registeredThisMonth = await this.userModel.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    return {
      success: true,
      message: 'User statistics calculated successfully',
      data: {
        totalMembers,
        totalStudents,
        totalDoctors,
        totalGlobalNetworks,
        registeredToday,
        registeredThisMonth,
      },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    let user: User;
    if (id.startsWith('CM')) {
      user = await this.userModel.findOne({ membershipId: id });
    } else {
      user = await this.userModel.findById(id);
    }
    if (!user) {
      throw new NotFoundException('User with id/membershipId does not exist');
    }
    return {
      success: true,
      message: 'User fetched successfully',
      data: user,
    };
  }

  async getSettings(user: string): Promise<ISuccessResponse> {
    const settings = await this.userSettingsModel.findOne({ user });
    return {
      success: true,
      message: 'User settings fetched successfully',
      data: settings,
    };
  }

  async updateSettings(
    user: string,
    updateUserSettingsDto: UpdateUserSettingsDto,
  ): Promise<ISuccessResponse> {
    let settings: any;
    const exists = await this.userSettingsModel.findOne({ user });

    if (exists) {
      settings = await this.userSettingsModel.findOneAndUpdate({ user }, updateUserSettingsDto, {
        new: true,
      });
    } else {
      settings = await this.userSettingsModel.create({ ...updateUserSettingsDto, user });
    }

    return {
      success: true,
      message: 'User settings updated successfully',
      data: settings,
    };
  }

  async getTransition(user: string): Promise<ISuccessResponse> {
    const transition = await this.transitionModel.findOne({ user });
    return {
      success: true,
      message: 'User transition info fetched successfully',
      data: transition,
    };
  }
  async getAllTransitions(): Promise<ISuccessResponse> {
    const transitions = await this.transitionModel.find().populate('user', '_id fullName role');
    return {
      success: true,
      message: 'All transition requests fetched successfully',
      data: transitions,
    };
  }

  async createTransition(
    user: string,
    createUserTransitionDto: CreateUserTransitionDto,
  ): Promise<ISuccessResponse> {
    const transition = await this.transitionModel.findOneAndUpdate(
      { user },
      createUserTransitionDto,
      { new: true, upsert: true },
    );
    return {
      success: true,
      message: 'User transition info updated successfully',
      data: transition,
    };
  }

  async updateTransitionStatus(id: string, status: TransitionStatus): Promise<ISuccessResponse> {
    const transition = await this.transitionModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('user', '_id role fullName email');

    const { user, region, specialty, licenseNumber }: any = transition;

    if (status === TransitionStatus.COMPLETED) {
      await this.userModel.findByIdAndUpdate(user._id, {
        region,
        specialty,
        licenseNumber,
        role: user.role === UserRole.STUDENT ? UserRole.DOCTOR : UserRole.GLOBALNETWORK,
        admissionYear: null,
        yearOfStudy: null,
      });

      await this.transitionModel.findByIdAndDelete(transition._id);

      const res = await this.emailService.sendTransitionSuccessEmal({
        name: user.fullName,
        email: user.email,
        oldRole: user.role,
        newRole: user.role === UserRole.STUDENT ? UserRole.DOCTOR : UserRole.GLOBALNETWORK,
        specialty,
        licenseNumber,
        newRegion: region,
      });

      if (!res.success) {
        throw new InternalServerErrorException(
          'Transition confirmed. Error occured while sending email',
        );
      }
    }

    return {
      success: true,
      message: 'User transition changed to ' + status,
      data: transition,
    };
  }

  async remove(membershipId: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findOneAndDelete({ membershipId });
    if (!user) {
      throw new NotFoundException('User with membershipId does not exist');
    }
    if (user.avatarCloudId) {
      await this.cloudinaryService.deleteFile(user.avatarCloudId);
    }

    return {
      success: true,
      message: 'User deleted successfully',
      data: user,
    };
  }
}
