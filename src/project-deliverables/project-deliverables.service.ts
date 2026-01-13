import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProjectDeliverable, DeliverableStatus } from './project-deliverables.schema';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';

@Injectable()
export class ProjectDeliverablesService {
  constructor(
    @InjectModel(ProjectDeliverable.name)
    private deliverableModel: Model<ProjectDeliverable>,
  ) {}

  async create(createDto: CreateDeliverableDto): Promise<ProjectDeliverable> {
    const deliverable = new this.deliverableModel(createDto);
    return deliverable.save();
  }

  async findAll(filters?: {
    status?: DeliverableStatus;
    category?: string;
    repository?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ProjectDeliverable[]> {
    const query: any = { isActive: true };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.repository) {
      query.repositories = filters.repository;
    }
    if (filters?.startDate || filters?.endDate) {
      query.completionDate = {};
      if (filters.startDate) {
        query.completionDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.completionDate.$lte = new Date(filters.endDate);
      }
    }

    return this.deliverableModel.find(query).sort({ completionDate: -1, createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<ProjectDeliverable> {
    return this.deliverableModel.findById(id).exec();
  }

  async update(id: string, updateDto: UpdateDeliverableDto): Promise<ProjectDeliverable> {
    return this.deliverableModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async remove(id: string): Promise<ProjectDeliverable> {
    return this.deliverableModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }

  async getStatistics() {
    const deliverables = await this.deliverableModel.find({ isActive: true }).exec();

    const stats = {
      total: deliverables.length,
      completed: 0,
      inProgress: 0,
      pending: 0,
      totalHoursEstimated: 0,
      totalHoursActual: 0,
      totalLinesOfCode: 0,
      totalCommits: 0,
      byCategory: {},
      byRepository: {},
      byStatus: {},
    };

    deliverables.forEach((item) => {
      // Status counts
      if (item.status === DeliverableStatus.COMPLETED) stats.completed++;
      else if (item.status === DeliverableStatus.IN_PROGRESS) stats.inProgress++;
      else if (item.status === DeliverableStatus.PENDING) stats.pending++;

      // Totals
      stats.totalHoursEstimated += item.estimatedTime || 0;
      stats.totalHoursActual += item.actualTime || 0;
      stats.totalLinesOfCode += item.linesOfCode || 0;
      stats.totalCommits += item.commits || 0;

      // By category
      const cat = item.category;
      if (!stats.byCategory[cat]) {
        stats.byCategory[cat] = { count: 0, hours: 0 };
      }
      stats.byCategory[cat].count++;
      stats.byCategory[cat].hours += item.actualTime || item.estimatedTime || 0;

      // By repository
      item.repositories?.forEach((repo) => {
        if (!stats.byRepository[repo]) {
          stats.byRepository[repo] = { count: 0, hours: 0, linesOfCode: 0 };
        }
        stats.byRepository[repo].count++;
        stats.byRepository[repo].hours += item.actualTime || item.estimatedTime || 0;
        stats.byRepository[repo].linesOfCode += item.linesOfCode || 0;
      });

      // By status
      const status = item.status;
      if (!stats.byStatus[status]) {
        stats.byStatus[status] = { count: 0, hours: 0 };
      }
      stats.byStatus[status].count++;
      stats.byStatus[status].hours += item.actualTime || item.estimatedTime || 0;
    });

    return stats;
  }

  async getTimeline() {
    const deliverables = await this.deliverableModel
      .find({ isActive: true, completionDate: { $exists: true } })
      .sort({ completionDate: 1 })
      .exec();

    const timeline = {};
    deliverables.forEach((item) => {
      const month = new Date(item.completionDate).toISOString().slice(0, 7);
      if (!timeline[month]) {
        timeline[month] = {
          count: 0,
          hours: 0,
          linesOfCode: 0,
          items: [],
        };
      }
      timeline[month].count++;
      timeline[month].hours += item.actualTime || item.estimatedTime || 0;
      timeline[month].linesOfCode += item.linesOfCode || 0;
      timeline[month].items.push({
        title: item.title,
        status: item.status,
        category: item.category,
      });
    });

    return timeline;
  }
}
