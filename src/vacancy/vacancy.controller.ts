import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllAdminRoles } from '../admin/admin.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyService } from './vacancy.service';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AllUserRoles } from '../users/user.constant';

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

  @Get('jobs/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for open and closed volunteer jobs' })
  getStats() {
    return this.vacancyService.getStats();
  }

  @Get('jobs/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a volunteer job by id' })
  findOne(@Param('id') id: string) {
    return this.vacancyService.findOne(id);
  }

  @Post('jobs/:id/register')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a volunteer job' })
  registerForJob(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.vacancyService.registerForJob(req.user.id, id);
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
