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
  Req,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventPaginationQueryDto } from './dto/event-pagination.dto';
import { AllUserRoles } from '../users/user.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { ConfirmEventPayDto } from './dto/update-event.dto';

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

  @Post('/pay/:slug')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pay for an event' })
  payForEvent(@Param('slug') slug: string, @Req() req: { user: IJwtPayload }) {
    return this.eventsService.payForEvent(req.user.id, slug);
  }

  @Post('/confirm-payment')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm payment for an event' })
  @ApiBody({ type: ConfirmEventPayDto })
  confirmEventPayment(@Body() confirmEventPayDto: ConfirmEventPayDto) {
    return this.eventsService.confirmEventPayment(confirmEventPayDto);
  }

  @Post('/register/:slug')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for an event' })
  registerForEvent(@Param('slug') slug: string, @Req() req: { user: IJwtPayload }) {
    return this.eventsService.registerForEvent(req.user.id, slug);
  }

  @Get('registered')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all events a user has registered for' })
  findRegistered(@Query() query: EventPaginationQueryDto, @Req() req: { user: IJwtPayload }) {
    return this.eventsService.findRegistered(req.user.id, query);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get an event by its slug' })
  findOne(@Param('slug') slug: string) {
    return this.eventsService.findOne(slug);
  }

  @Get(':slug/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the statistics of an event by its slug' })
  findOneStat(@Param('slug') slug: string) {
    return this.eventsService.findOneStat(slug);
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
