import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VolunteersService } from './volunteers.service';
import { CreateVolunteerJobDto } from './dto/create-volunteer-job.dto';
import { UpdateVolunteerJobDto } from './dto/update-volunteer-job.dto';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftStatusDto } from './dto/update-shift-status.dto';
import { VolunteerQueryDto } from './dto/volunteer-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { AllUserRoles } from '../users/user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';

@ApiTags('Volunteer')
@Controller('volunteer')
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  // ── Public endpoints ──────────────────────────────────────────────

  @Get('jobs')
  @Public()
  @ApiOperation({ summary: 'List all volunteer jobs (public)' })
  findAllJobs(@Query() query: VolunteerQueryDto) {
    return this.volunteersService.findAllJobs(query);
  }

  @Get('jobs/:id')
  @Public()
  @ApiOperation({ summary: 'Get a single volunteer job by id' })
  findOneJob(@Param('id') id: string) {
    return this.volunteersService.findOneJob(id);
  }

  // ── Authenticated user endpoints ──────────────────────────────────

  @Post('jobs/:id/register')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply for a volunteer job' })
  applyForJob(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.applyForJob(req.user.id, id);
  }

  @Delete('jobs/:id/register')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw application from a volunteer job' })
  withdrawApplication(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.withdrawApplication(req.user.id, id);
  }

  @Get('my-applications')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s job applications' })
  getMyApplications(@Query() query: VolunteerQueryDto, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.getMyApplications(req.user.id, query);
  }

  @Get('jobs/:jobId/shifts')
  @Public()
  @ApiOperation({ summary: 'Get shifts for a volunteer job' })
  getShiftsForJob(@Param('jobId') jobId: string, @Query() query: VolunteerQueryDto) {
    return this.volunteersService.getShiftsForJob(jobId, query);
  }

  @Post('shifts/:shiftId/signup')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sign up for a volunteer shift' })
  signUpForShift(@Param('shiftId') shiftId: string, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.signUpForShift(req.user.id, shiftId);
  }

  @Delete('shifts/:shiftId/signup')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw from a volunteer shift' })
  withdrawFromShift(@Param('shiftId') shiftId: string, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.withdrawFromShift(req.user.id, shiftId);
  }

  @Get('my-shifts')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s shifts' })
  getMyShifts(@Query() query: VolunteerQueryDto, @Req() req: { user: IJwtPayload }) {
    return this.volunteersService.getMyShifts(req.user.id, query);
  }

  // ── Admin endpoints ───────────────────────────────────────────────

  @Post('jobs')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a volunteer job (admin)' })
  @ApiBody({ type: CreateVolunteerJobDto })
  createJob(@Body() dto: CreateVolunteerJobDto) {
    return this.volunteersService.createJob(dto);
  }

  @Patch('jobs/:id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a volunteer job (admin)' })
  updateJob(@Param('id') id: string, @Body() dto: UpdateVolunteerJobDto) {
    return this.volunteersService.updateJob(id, dto);
  }

  @Post('jobs/:jobId/shifts')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shift for a volunteer job (admin)' })
  @ApiBody({ type: CreateShiftDto })
  createShift(@Param('jobId') jobId: string, @Body() dto: CreateShiftDto) {
    return this.volunteersService.createShift(jobId, dto);
  }

  @Patch('shifts/:id/status')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a volunteer\'s shift status (admin)' })
  @ApiBody({ type: UpdateShiftStatusDto })
  updateShiftStatus(@Param('id') id: string, @Body() dto: UpdateShiftStatusDto) {
    return this.volunteersService.updateShiftStatus(id, dto);
  }
}
