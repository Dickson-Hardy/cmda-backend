import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllAdminRoles } from '../admin/admin.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyService } from './vacancy.service';

@ApiTags('Vacancy')
@Controller('vacancy')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a vacancy' })
  @ApiBody({ type: CreateVacancyDto })
  create(@Body() createVacancyDto: CreateVacancyDto) {
    return this.vacancyService.create(createVacancyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Fetch all vacancies' })
  @Public()
  findAll(@Query() query: PaginationQueryDto) {
    return this.vacancyService.findAll(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a vacancy by id' })
  findOne(@Param('id') id: string) {
    return this.vacancyService.findOne(id);
  }

  @Get(':id/applicants')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applicants for a vacancy' })
  findApplicants(@Param('id') id: string) {
    return this.vacancyService.findApplicants(id);
  }

  @Patch(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a vacacny by id' })
  update(@Param('id') id: string, @Body() updateVacancyDto: UpdateVacancyDto) {
    return this.vacancyService.update(id, updateVacancyDto);
  }

  @Delete(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a vacancy by id' })
  remove(@Param('id') id: string) {
    return this.vacancyService.remove(id);
  }
}
