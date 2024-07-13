import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventPaginationQueryDto } from './dto/event-pagination.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an event' })
  @ApiBody({ type: CreateEventDto })
  @UseInterceptors(FileInterceptor('featuredImage'))
  create(@Body() createEventDto: CreateEventDto, @UploadedFile() file: Express.Multer.File) {
    return this.eventsService.create(createEventDto, file);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all events' })
  findAll(@Query() query: EventPaginationQueryDto) {
    return this.eventsService.findAll(query);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an event by its slug' })
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOne(slug);
  }

  @Patch(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an event by its slug' })
  @UseInterceptors(FileInterceptor('featuredImage'))
  updateOne(
    @Param('slug') slug: string,
    @Body() updateEventDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.eventsService.updateOne(slug, updateEventDto, file);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event by its slug' })
  removeOne(@Param('slug') slug: string) {
    return this.eventsService.removeOne(slug);
  }
}
