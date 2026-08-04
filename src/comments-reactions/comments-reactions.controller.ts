import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsReactionsService } from './comments-reactions.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ToggleReactionDto } from './dto/toggle-reaction.dto';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { CreatePersonalEventDto } from './dto/create-personal-event.dto';
import { UpdatePersonalEventDto } from './dto/update-personal-event.dto';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { AllUserRoles } from '../users/user.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { IJwtPayload } from '../_global/interface/jwt-payload';

@ApiTags('Comments & Reactions')
@Controller()
export class CommentsReactionsController {
  constructor(private readonly service: CommentsReactionsService) {}

  @Post('comments')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a comment on an event or faith entry' })
  @ApiBody({ type: CreateCommentDto })
  createComment(@Req() req: { user: IJwtPayload }, @Body() dto: CreateCommentDto) {
    return this.service.createComment(req.user.id, dto.content, dto.parentType, dto.parentId, dto.isAnonymous);
  }

  @Get('comments/:parentType/:parentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get comments for an event or faith entry' })
  getComments(
    @Param('parentType') parentType: string,
    @Param('parentId') parentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getComments(parentType, parentId, page, limit);
  }

  @Delete('comments/:id')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own comment' })
  deleteComment(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.service.deleteComment(id, req.user.id);
  }

  @Post('reactions')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle a reaction on an event or faith entry' })
  @ApiBody({ type: ToggleReactionDto })
  toggleReaction(@Req() req: { user: IJwtPayload }, @Body() dto: ToggleReactionDto) {
    return this.service.toggleReaction(req.user.id, dto.parentType, dto.parentId, dto.type);
  }

  @Get('reactions/:parentType/:parentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get reactions for an event or faith entry' })
  getReactions(
    @Req() req: { user: IJwtPayload },
    @Param('parentType') parentType: string,
    @Param('parentId') parentId: string,
  ) {
    return this.service.getReactions(parentType, parentId, req.user.id);
  }

  @Post('events/:eventId/feedback')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit feedback for an event' })
  @ApiBody({ type: CreateFeedbackDto })
  submitFeedback(
    @Req() req: { user: IJwtPayload },
    @Param('eventId') eventId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.service.submitEventFeedback(req.user.id, eventId, dto.rating, dto.comment);
  }

  @Get('events/:eventId/feedback')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get feedback for an event' })
  getFeedback(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getEventFeedback(eventId, page, limit);
  }

  @Get('events/:eventId/average-rating')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get average rating for an event' })
  getAverageRating(@Param('eventId') eventId: string) {
    return this.service.getEventAverageRating(eventId);
  }

  @Post('calendar/personal')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a personal calendar event' })
  @ApiBody({ type: CreatePersonalEventDto })
  createPersonalEvent(@Req() req: { user: IJwtPayload }, @Body() dto: CreatePersonalEventDto) {
    return this.service.createPersonalEvent(req.user.id, dto);
  }

  @Get('calendar/personal')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personal calendar events' })
  getPersonalEvents(
    @Req() req: { user: IJwtPayload },
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.service.getPersonalEvents(req.user.id, fromDate, toDate);
  }

  @Patch('calendar/personal/:id')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a personal calendar event' })
  @ApiBody({ type: UpdatePersonalEventDto })
  updatePersonalEvent(
    @Param('id') id: string,
    @Req() req: { user: IJwtPayload },
    @Body() dto: UpdatePersonalEventDto,
  ) {
    return this.service.updatePersonalEvent(id, req.user.id, dto);
  }

  @Delete('calendar/personal/:id')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a personal calendar event' })
  deletePersonalEvent(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.service.deletePersonalEvent(id, req.user.id);
  }

  @Post('events/:eventId/reminders')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reminder for an event' })
  @ApiBody({ type: CreateReminderDto })
  createReminder(
    @Req() req: { user: IJwtPayload },
    @Param('eventId') eventId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.service.createEventReminder(req.user.id, eventId, dto.reminderDate, dto.method);
  }

  @Get('events/reminders')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user event reminders' })
  getReminders(@Req() req: { user: IJwtPayload }) {
    return this.service.getEventReminders(req.user.id);
  }

  @Delete('events/reminders/:id')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an event reminder' })
  deleteReminder(@Param('id') id: string, @Req() req: { user: IJwtPayload }) {
    return this.service.deleteEventReminder(id, req.user.id);
  }

  @Get('events/:eventId/attendees')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get attendees for an event' })
  getAttendees(
    @Param('eventId') eventId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getEventAttendees(eventId, page, limit);
  }
}
