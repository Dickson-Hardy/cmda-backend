import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllAdminRoles } from '../admin/admin.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyService } from './vacancy.service';

@ApiTags('Volunteer')
@Controller('volunteer')
export class VacancyController {
  constructor(private readonly vacancyService: VacancyService) {}

  @Post('jobs')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a volunteer job' })
  @ApiBody({ type: CreateVacancyDto })
  create(@Body() createVacancyDto: CreateVacancyDto) {
    return this.vacancyService.create(createVacancyDto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Fetch all volunteer jobs' })
  @ApiBearerAuth()
  findAll(@Query() query: PaginationQueryDto) {
    return this.vacancyService.findAll(query);
  }

  @Get('jobs/:id')
  @Public()
  @ApiOperation({ summary: 'Get a volunteer job by id' })
  findOne(@Param('id') id: string) {
    return this.vacancyService.findOne(id);
  }

  @Get('jobs/:id/applicants')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applicants for a volunteer job' })
  findApplicants(@Param('id') id: string) {
    return this.vacancyService.findApplicants(id);
  }

  @Patch('jobs/:id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a volunteer job by id' })
  update(@Param('id') id: string, @Body() updateVacancyDto: UpdateVacancyDto) {
    return this.vacancyService.update(id, updateVacancyDto);
  }

  @Delete('jobs/:id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a volunteer job by id' })
  remove(@Param('id') id: string) {
    return this.vacancyService.remove(id);
  }
}
