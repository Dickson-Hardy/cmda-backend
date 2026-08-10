import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VolunteerJob } from './volunteer-job.schema';
import { VolunteerShift } from './volunteer-shift.schema';
import { CreateVolunteerJobDto } from './dto/create-volunteer-job.dto';
import { UpdateVolunteerJobDto } from './dto/update-volunteer-job.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { VolunteerQueryDto } from './dto/volunteer-query.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotificationType } from '../notifications/notification.constant';

@Injectable()
export class VolunteersService {
  constructor(
    @InjectModel(VolunteerJob.name)
    private volunteerJobModel: Model<VolunteerJob>,
    @InjectModel(VolunteerShift.name)
    private volunteerShiftModel: Model<VolunteerShift>,
    private notificationDispatcher?: NotificationDispatcherService,
  ) {}

  // ── Job methods ────────────────────────────────────────────────────

  async findAllJobs(query: VolunteerQueryDto): Promise<ISuccessResponse> {
    const { page, limit, searchBy, category } = query;
    const search = query.search || searchBy;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') },
        { location: new RegExp(search, 'i') },
      ];
    }

    if (category) {
      filter.category = category;
    }

    const currentDate = new Date();
    await this.volunteerJobModel.updateMany(
      { closingDate: { $lte: currentDate }, isActive: true },
      { $set: { isActive: false } },
    );
    await this.volunteerJobModel.updateMany(
      { closingDate: { $gt: currentDate, $exists: true }, isActive: false },
      { $set: { isActive: true } },
    );

    const items = await this.volunteerJobModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.volunteerJobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Volunteer jobs fetched successfully',
      data: {
        items,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOneJob(id: string): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.findById(id);
    if (!job) throw new NotFoundException('Volunteer job not found');

    const applicantCount = job.applicants?.length ?? 0;

    return {
      success: true,
      message: 'Volunteer job fetched successfully',
      data: { ...job.toObject(), applicantCount },
    };
  }

  async createJob(dto: CreateVolunteerJobDto): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.create(dto);
    return {
      success: true,
      message: 'Volunteer job created successfully',
      data: job,
    };
  }

  async updateJob(id: string, dto: UpdateVolunteerJobDto): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.findByIdAndUpdate(id, dto, { new: true });
    if (!job) throw new NotFoundException('Volunteer job not found');
    return {
      success: true,
      message: 'Volunteer job updated successfully',
      data: job,
    };
  }

  async applyForJob(userId: string, jobId: string): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.findById(jobId).lean();
    if (!job) throw new NotFoundException('Volunteer job not found');

    if (job.closingDate && new Date(job.closingDate) < new Date()) {
      throw new BadRequestException('This volunteer job is no longer accepting applications');
    }

    const alreadyApplied = job.applicants?.some(
      (a) => a.user.toString() === userId,
    );
    if (alreadyApplied) {
      throw new ConflictException('You have already applied for this job');
    }

    const updated = await this.volunteerJobModel.findByIdAndUpdate(
      jobId,
      {
        $push: { applicants: { user: new Types.ObjectId(userId), appliedAt: new Date(), status: 'pending' } },
      },
      { new: true },
    );
    void this.notificationDispatcher?.notify({
      userId,
      type: NotificationType.VOLUNTEER,
      title: 'Volunteer application received',
      body: `Your application for ${job.title} has been submitted.`,
      idempotencyKey: `volunteer:${jobId}:application:${userId}`,
      preference: 'announcements',
      data: { volunteerId: jobId },
    });

    return {
      success: true,
      message: 'Successfully applied for volunteer job',
      data: updated,
    };
  }

  async withdrawApplication(userId: string, jobId: string): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.findById(jobId);
    if (!job) throw new NotFoundException('Volunteer job not found');

    const applied = job.applicants?.some(
      (a) => a.user.toString() === userId,
    );
    if (!applied) throw new BadRequestException('You have not applied for this job');

    await this.volunteerJobModel.findByIdAndUpdate(jobId, {
      $pull: { applicants: { user: new Types.ObjectId(userId) } },
    });

    return {
      success: true,
      message: 'Application withdrawn successfully',
    };
  }

  async getMyApplications(userId: string, query: VolunteerQueryDto): Promise<ISuccessResponse> {
    const { page, limit } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const filter = { 'applicants.user': new Types.ObjectId(userId) };

    const items = await this.volunteerJobModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.volunteerJobModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / perPage);

    const data = items.map((job) => {
      const application = job.applicants.find(
        (a) => a.user.toString() === userId,
      );
      return { ...job.toObject(), application };
    });

    return {
      success: true,
      message: 'Your applications fetched successfully',
      data: {
        items: data,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  // ── Shift methods ─────────────────────────────────────────────────

  async createShift(jobId: string, dto: CreateShiftDto): Promise<ISuccessResponse> {
    const job = await this.volunteerJobModel.findById(jobId);
    if (!job) throw new NotFoundException('Volunteer job not found');

    const shift = await this.volunteerShiftModel.create({
      ...dto,
      job: new Types.ObjectId(jobId),
    });

    return {
      success: true,
      message: 'Volunteer shift created successfully',
      data: shift,
    };
  }

  async getShiftsForJob(jobId: string, query: VolunteerQueryDto): Promise<ISuccessResponse> {
    const { page, limit } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const filter = { job: new Types.ObjectId(jobId) };

    const items = await this.volunteerShiftModel
      .find(filter)
      .sort({ startTime: 1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.volunteerShiftModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Shifts fetched successfully',
      data: {
        items,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async signUpForShift(userId: string, shiftId: string): Promise<ISuccessResponse> {
    const shift = await this.volunteerShiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const alreadySignedUp = shift.volunteers.some(
      (v) => v.user.toString() === userId,
    );
    if (alreadySignedUp) {
      throw new ConflictException('You are already signed up for this shift');
    }

    if (shift.volunteers.length >= shift.maxVolunteers) {
      throw new BadRequestException('This shift is already at full capacity');
    }

    shift.volunteers.push({
      user: new Types.ObjectId(userId) as any,
      status: 'signed_up',
    });
    await shift.save();

    return {
      success: true,
      message: 'Successfully signed up for shift',
      data: shift,
    };
  }

  async withdrawFromShift(userId: string, shiftId: string): Promise<ISuccessResponse> {
    const shift = await this.volunteerShiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const signedUp = shift.volunteers.some(
      (v) => v.user.toString() === userId,
    );
    if (!signedUp) {
      throw new BadRequestException('You are not signed up for this shift');
    }

    await this.volunteerShiftModel.findByIdAndUpdate(shiftId, {
      $pull: { volunteers: { user: new Types.ObjectId(userId) } },
    });

    return {
      success: true,
      message: 'Successfully withdrawn from shift',
    };
  }

  async getMyShifts(userId: string, query: VolunteerQueryDto): Promise<ISuccessResponse> {
    const { page, limit } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const filter = { 'volunteers.user': new Types.ObjectId(userId) };

    const items = await this.volunteerShiftModel
      .find(filter)
      .populate('job')
      .sort({ startTime: 1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));

    const totalItems = await this.volunteerShiftModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / perPage);

    const data = items.map((shift) => {
      const volunteer = shift.volunteers.find(
        (v) => v.user.toString() === userId,
      );
      return { ...shift.toObject(), myStatus: volunteer?.status };
    });

    return {
      success: true,
      message: 'Your shifts fetched successfully',
      data: {
        items: data,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async updateShiftStatus(
    shiftId: string,
    dto: UpdateShiftStatusDto,
  ): Promise<ISuccessResponse> {
    const shift = await this.volunteerShiftModel.findById(shiftId);
    if (!shift) throw new NotFoundException('Shift not found');

    const volunteerIndex = shift.volunteers.findIndex(
      (v) => v.user.toString() === dto.userId,
    );
    if (volunteerIndex === -1) {
      throw new NotFoundException('User is not signed up for this shift');
    }

    shift.volunteers[volunteerIndex].status = dto.status;
    await shift.save();
    void this.notificationDispatcher?.notify({
      userId: dto.userId,
      type: NotificationType.VOLUNTEER,
      title: 'Volunteer shift updated',
      body: `${shift.title} is now marked ${dto.status.replace('_', ' ')}.`,
      idempotencyKey: `volunteer-shift:${shift._id}:${dto.userId}:${dto.status}`,
      preference: 'announcements',
      data: { volunteerId: shift._id.toString() },
    });

    return {
      success: true,
      message: 'Volunteer shift status updated successfully',
      data: shift,
    };
  }
}
