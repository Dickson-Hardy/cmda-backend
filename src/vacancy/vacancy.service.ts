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
      message: 'Vacancy created successfully',
      data: vacancy,
    };
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { keyword, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = keyword ? { title: { $regex: keyword, $options: 'i' } } : {};

    const vacancies = await this.vacancyModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.vacancyModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Vacancies fetched successfully',
      data: {
        items: vacancies,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findById(id);
    return {
      success: true,
      message: 'Vacancy fetched successfully',
      data: vacancy,
    };
  }

  async findApplicants(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findById(id).populate('applicants');
    const { title, applicants, companyName, companyLocation, _id } = vacancy;
    return {
      success: true,
      message: 'Applicants for a vacancy fetched successfully',
      data: { _id, title, companyName, companyLocation, applicants },
    };
  }

  async update(id: string, updateVacancyDto: UpdateVacancyDto): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findByIdAndUpdate(id, updateVacancyDto, {
      new: true,
    });
    if (!vacancy) {
      throw new NotFoundException('No vacancy with such id');
    }
    return {
      success: true,
      message: 'Vacancy updated successfully',
      data: vacancy,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const vacancy = await this.vacancyModel.findByIdAndDelete(id);
    if (!vacancy) {
      throw new NotFoundException('No vacancy with such id');
    }
    return {
      success: true,
      message: 'Vacancy deleted successfully',
      data: vacancy,
    };
  }
}
