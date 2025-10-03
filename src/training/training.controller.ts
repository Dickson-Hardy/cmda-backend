import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TrainingService } from './training.service';
import { CreateTrainingDto } from './dto/create-training.dto';
import { AllAdminRoles } from '../admin/admin.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrainingQueryDto } from './dto/training-query.dto';
import { UpdateCompletedUsersDto } from './dto/update-completed-users.dto';

@ApiTags('Trainings')
@Controller('trainings')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a training' })
  @ApiBody({ type: CreateTrainingDto })
  create(@Body() createTrainingDto: CreateTrainingDto) {
    return this.trainingService.create(createTrainingDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all trainings' })
  findAll(@Query() query: TrainingQueryDto) {
    return this.trainingService.findAll(query);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get training statistics' })
  getStats() {
    return this.trainingService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a training by its id' })
  findOne(@Param('id') id: string) {
    return this.trainingService.findOne(id);
  }

  @Patch(':id/completed')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Updates the completed users list of a training using an array of emails',
  })
  updateCompletedUsers(
    @Param('id') id: string,
    @Body() updateCompletedUsersDto: UpdateCompletedUsersDto,
  ) {
    return this.trainingService.updateCompletedUsers(id, updateCompletedUsersDto.completedUsers);
  }

  @Delete(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a training by its id' })
  remove(@Param('id') id: string) {
    return this.trainingService.remove(id);
  }
}
