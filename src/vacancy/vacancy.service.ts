import { Injectable, NotFoundException } from '@nestjs/common';
import { ISuccessResponse } from '../_global/interface/success-response';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Vacancy } from './vacancy.schema';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';

@Injectable()
export class VacancyService {
  constructor(
    @InjectModel(Vacancy.name)
    private vacancyModel: Model<Vacancy>,
  ) {}

  async create(createVacancyDto: CreateVacancyDto): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.create(createVacancyDto);
    return {
      success: true,
      message: 'Volunteer job created successfully',
      data: vacancy,
    };
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy
      ? {
          $or: [
            { title: new RegExp(searchBy, 'i') },
            { description: new RegExp(searchBy, 'i') },
            { responsibilities: new RegExp(searchBy, 'i') },
            { requirements: new RegExp(searchBy, 'i') },
            { companyName: new RegExp(searchBy, 'i') },
            { companyLocation: new RegExp(searchBy, 'i') },
          ],
        }
      : {};

    const vacancies = await this.vacancyModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.vacancyModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Volunteer jobs fetched successfully',
      data: {
        items: vacancies,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async getStats(): Promise<ISuccessResponse> {
    const totalJobs = await this.vacancyModel.countDocuments();
    const totalOpen = await this.vacancyModel.countDocuments({ isActive: true });
    const totalClosed = await this.vacancyModel.countDocuments({ isActive: false });

    return {
      success: true,
      message: 'Volunteer jobs statistics calculated successfully',
      data: { totalJobs, totalOpen, totalClosed },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findById(id);
    return {
      success: true,
      message: 'Volunteer job fetched successfully',
      data: vacancy,
    };
  }

  async findApplicants(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findById(id).populate('applicants');
    const { title, applicants, companyName, companyLocation, _id } = vacancy;
    return {
      success: true,
      message: 'Applicants for a volunteer jobs fetched successfully',
      data: { _id, title, companyName, companyLocation, applicants },
    };
  }

  async update(id: string, updateVacancyDto: UpdateVacancyDto): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findByIdAndUpdate(id, updateVacancyDto, {
      new: true,
    });
    if (!vacancy) {
      throw new NotFoundException('No volunteer job with such id');
    }
    return {
      success: true,
      message: 'Volunteer job updated successfully',
      data: vacancy,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findByIdAndDelete(id);
    if (!vacancy) {
      throw new NotFoundException('No volunteer job with such id');
    }
    return {
      success: true,
      message: 'Volunteer job deleted successfully',
      data: vacancy,
    };
  }
}
