import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { User } from './users.schema';
import { UserPaginationQueryDto } from './dto/user-pagination.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async findAll(query: UserPaginationQueryDto): Promise<ISuccessResponse> {
    const { fullName, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = fullName ? { fullName: { $regex: fullName, $options: 'i' } } : {};

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

  async findOne(membershipId: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findOne({ membershipId });
    if (!user) throw new NotFoundException('User with membershipId does not exist');
    return {
      success: true,
      message: 'User fetched successfully',
      data: user,
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
