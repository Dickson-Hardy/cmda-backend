import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from './schema/users.schema';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UserRole } from './user.constant';
import { json2csv } from 'json-2-csv';
import { ExportUsersDto } from './dto/export-user.dto';
import { UserSettings } from './schema/user-settings.schema';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserSettings.name) private userSettingsModel: Model<UserSettings>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query: UserPaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, role, region } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria: any = {};
    if (searchBy) {
      searchCriteria.$or = [
        { firstName: new RegExp(searchBy, 'i') },
        { middleName: new RegExp(searchBy, 'i') },
        { lastName: new RegExp(searchBy, 'i') },
        { email: new RegExp(searchBy, 'i') },
        { specialty: new RegExp(searchBy, 'i') },
        { licenseNumber: new RegExp(searchBy, 'i') },
        { membershipId: new RegExp(searchBy, 'i') },
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

  async exportAll(query: ExportUsersDto): Promise<any> {
    const { role, region } = query;
    const searchCriteria: any = {};
    if (role) searchCriteria.role = role;
    if (region) searchCriteria.region = region;

    const users = await this.userModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .select('membershipId firstName middleName lastName email role region createdAt')
      .lean();

    const usersJson = users.map((user: any) => ({
      membershipId: user.membershipId,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      region: user.region,
      createdAt: new Date(user.createdAt).toLocaleString('en-US', { dateStyle: 'medium' }),
    }));

    const csv = await json2csv(usersJson);

    return csv;
  }

  async getStats(): Promise<ISuccessResponse> {
    const totalMembers = await this.userModel.countDocuments();
    const totalStudents = await this.userModel.countDocuments({ role: UserRole.STUDENT });
    const totalDoctors = await this.userModel.countDocuments({ role: UserRole.DOCTOR });
    const totalGlobalNetworks = await this.userModel.countDocuments({
      role: UserRole.GLOBALNETWORK,
    });

    return {
      success: true,
      message: 'User statistics calculated successfully',
      data: { totalMembers, totalStudents, totalDoctors, totalGlobalNetworks },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    let user: User;
    if (id.startsWith('CM')) {
      user = await this.userModel.findOne({ membershipId: id });
    } else {
      user = await this.userModel.findById(id);
    }

    if (!user) throw new NotFoundException('User with id/membershipId does not exist');
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
    const settings = await this.userSettingsModel.findOneAndUpdate(
      { user },
      updateUserSettingsDto,
      { new: true, upsert: true },
    );
    return {
      success: true,
      message: 'User settings updated successfully',
      data: settings,
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
