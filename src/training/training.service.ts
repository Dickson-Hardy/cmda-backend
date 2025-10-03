import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTrainingDto } from './dto/create-training.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Training } from './training.schema';
import { Model } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { TrainingQueryDto } from './dto/training-query.dto';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';

@Injectable()
export class TrainingService {
  constructor(
    @InjectModel(Training.name) private trainingModel: Model<Training>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createTrainingDto: CreateTrainingDto): Promise<ISuccessResponse> {
    try {
      const training = await this.trainingModel.create(createTrainingDto);

      return {
        success: true,
        message: `Training created successfully`,
        data: training,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Training with same name already exists');
      }
      throw error;
    }
  }

  async findAll(query: TrainingQueryDto): Promise<ISuccessResponse> {
    const { searchBy, membersGroup } = query;
    const searchCriteria: any = searchBy ? { name: { $regex: searchBy, $options: 'i' } } : {};
    if (membersGroup) searchCriteria.membersGroup = membersGroup;

    const trainings = await this.trainingModel.find(searchCriteria).sort({ createdAt: -1 });

    return {
      success: true,
      message: 'Trainings fetched successfully',
      data: trainings,
    };
  }

  async getStats(): Promise<ISuccessResponse> {
    const totalTrainings = await this.trainingModel.countDocuments();
    const studentTrainings = await this.trainingModel.countDocuments({
      membersGroup: UserRole.STUDENT,
    });
    const doctorTrainings = await this.trainingModel.countDocuments({
      membersGroup: UserRole.DOCTOR,
    });

    return {
      success: true,
      message: 'Trainings statistics calculated successfully',
      data: { totalTrainings, studentTrainings, doctorTrainings },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const training = await this.trainingModel
      .findById(id)
      .populate('completedUsers', '_id membershipId fullName email role region');

    if (!training) {
      throw new NotFoundException('No training with such id');
    }

    return {
      success: true,
      message: `Training fetched successfully`,
      data: training,
    };
  }

  async updateCompletedUsers(id: string, emails: string[]): Promise<ISuccessResponse> {
    if (!emails || emails.length === 0) {
      throw new BadRequestException('No emails provided');
    }

    const training = await this.trainingModel.findById(id);
    if (!training) {
      throw new NotFoundException('No training found with the provided id');
    }

    const users = await this.userModel
      .find({ email: { $in: emails }, role: training.membersGroup })
      .lean();

    if (!users.length) {
      throw new NotFoundException(`No ${training.membersGroup} found with the provided emails`);
    }

    const userIds: any[] = users.map((user) => user._id);

    // Update the training document using $addToSet to ensure no duplicates
    const newTraining = await this.trainingModel.findByIdAndUpdate(
      id,
      { $addToSet: { completedUsers: { $each: userIds } } },
      { new: true },
    );

    return {
      success: true,
      message: 'Training updated successfully',
      data: newTraining,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const training = await this.trainingModel.findByIdAndDelete(id);
    if (!training) {
      throw new NotFoundException('No training with such id');
    }
    return {
      success: true,
      message: `Training deleted successfully`,
      data: training,
    };
  }
}
