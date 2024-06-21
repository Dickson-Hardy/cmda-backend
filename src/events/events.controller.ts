import { Controller, Get, Post, Body, Param, Patch, Delete, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an event' })
  @ApiBody({ type: CreateEventDto })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.create(createEventDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all events' })
  findAll(@Query() query: PaginationQueryDto) {
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
  updateOne(@Param('slug') slug: string, @Body() updateEventDto) {
    return this.eventsService.updateOne(slug, updateEventDto);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event by its slug' })
  removeOne(@Param('slug') slug: string) {
    return this.eventsService.removeOne(slug);
  }
}
