import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ISuccessResponse } from '../_global/interface/success-response';
import { Comment } from './comment.schema';
import { Reaction } from './reaction.schema';
import { EventFeedback } from './event-feedback.schema';
import { PersonalEvent } from './personal-event.schema';
import { EventReminder } from './event-reminder.schema';
import { Event } from '../events/events.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class CommentsReactionsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    @InjectModel(Reaction.name) private reactionModel: Model<Reaction>,
    @InjectModel(EventFeedback.name) private feedbackModel: Model<EventFeedback>,
    @InjectModel(PersonalEvent.name) private personalEventModel: Model<PersonalEvent>,
    @InjectModel(EventReminder.name) private reminderModel: Model<EventReminder>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createComment(
    userId: string,
    content: string,
    parentType: string,
    parentId: string,
    isAnonymous?: boolean,
  ): Promise<ISuccessResponse> {
    const comment = await this.commentModel.create({
      content,
      user: userId,
      parentType,
      parentId: new Types.ObjectId(parentId),
      isAnonymous: isAnonymous ?? false,
    });

    const populated = await comment.populate('user', '_id fullName email membershipId');
    const result = isAnonymous
      ? { ...populated.toObject(), user: { _id: null, fullName: 'Anonymous', email: null, membershipId: null } }
      : populated;

    return {
      success: true,
      message: 'Comment created successfully',
      data: result,
    };
  }

  async getComments(parentType: string, parentId: string, page?: string, limit?: string): Promise<ISuccessResponse> {
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const filter = { parentType, parentId: new Types.ObjectId(parentId) };

    const [items, totalItems] = await Promise.all([
      this.commentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(perPage)
        .skip(perPage * (currentPage - 1))
        .populate('user', '_id fullName email membershipId'),
      this.commentModel.countDocuments(filter),
    ]);

    const sanitized = items.map((c) => {
      if (c.isAnonymous) {
        return { ...c.toObject(), user: { _id: null, fullName: 'Anonymous', email: null, membershipId: null } };
      }
      return c;
    });

    return {
      success: true,
      message: 'Comments fetched successfully',
      data: {
        items: sanitized,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) },
      },
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<ISuccessResponse> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.user.toString() !== userId) throw new ForbiddenException('You can only delete your own comments');

    await comment.deleteOne();
    return { success: true, message: 'Comment deleted successfully', data: comment };
  }

  async toggleReaction(
    userId: string,
    parentType: string,
    parentId: string,
    reactionType: string,
  ): Promise<ISuccessResponse> {
    const filter = {
      user: new Types.ObjectId(userId),
      parentType,
      parentId: new Types.ObjectId(parentId),
      type: reactionType,
    };

    const existing = await this.reactionModel.findOne(filter);
    if (existing) {
      await existing.deleteOne();
      return { success: true, message: 'Reaction removed', data: { removed: true, type: reactionType } };
    }

    const reaction = await this.reactionModel.create(filter);
    return { success: true, message: 'Reaction added', data: reaction };
  }

  async getReactions(parentType: string, parentId: string, userId?: string): Promise<ISuccessResponse> {
    const filter = { parentType, parentId: new Types.ObjectId(parentId) };
    const reactions = await this.reactionModel.find(filter);

    const counts: Record<string, number> = {};
    const userReactions: string[] = [];

    for (const r of reactions) {
      counts[r.type] = (counts[r.type] || 0) + 1;
      if (userId && r.user.toString() === userId) {
        userReactions.push(r.type);
      }
    }

    return {
      success: true,
      message: 'Reactions fetched successfully',
      data: { counts, userReactions },
    };
  }

  async submitEventFeedback(userId: string, eventId: string, rating: number, comment?: string): Promise<ISuccessResponse> {
    const feedback = await this.feedbackModel.findOneAndUpdate(
      { user: new Types.ObjectId(userId), event: new Types.ObjectId(eventId) },
      { $set: { rating, comment: comment ?? '' } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return { success: true, message: 'Feedback submitted successfully', data: feedback };
  }

  async getEventFeedback(eventId: string, page?: string, limit?: string): Promise<ISuccessResponse> {
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const filter = { event: new Types.ObjectId(eventId) };

    const [items, totalItems] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(perPage)
        .skip(perPage * (currentPage - 1))
        .populate('user', '_id fullName email membershipId'),
      this.feedbackModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Event feedback fetched successfully',
      data: {
        items,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) },
      },
    };
  }

  async getEventAverageRating(eventId: string): Promise<ISuccessResponse> {
    const result = await this.feedbackModel.aggregate([
      { $match: { event: new Types.ObjectId(eventId) } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    const data = result[0] || { averageRating: 0, count: 0 };
    return {
      success: true,
      message: 'Average rating fetched successfully',
      data: { averageRating: Math.round(data.averageRating * 10) / 10, count: data.count },
    };
  }

  async createPersonalEvent(userId: string, dto: { title: string; description?: string; eventDate: string; color?: string; category?: string; allDay?: boolean }): Promise<ISuccessResponse> {
    const personalEvent = await this.personalEventModel.create({
      user: new Types.ObjectId(userId),
      title: dto.title,
      description: dto.description ?? '',
      eventDate: new Date(dto.eventDate),
      color: dto.color ?? '',
      category: dto.category ?? 'other',
      allDay: dto.allDay ?? false,
    });

    return { success: true, message: 'Personal event created successfully', data: personalEvent };
  }

  async getPersonalEvents(userId: string, fromDate?: string, toDate?: string): Promise<ISuccessResponse> {
    const filter: any = { user: new Types.ObjectId(userId) };
    if (fromDate || toDate) {
      filter.eventDate = {};
      if (fromDate) filter.eventDate.$gte = new Date(fromDate);
      if (toDate) filter.eventDate.$lte = new Date(toDate);
    }

    const items = await this.personalEventModel.find(filter).sort({ eventDate: 1 });
    return { success: true, message: 'Personal events fetched successfully', data: items };
  }

  async updatePersonalEvent(eventId: string, userId: string, dto: { title?: string; description?: string; eventDate?: string; color?: string; category?: string; allDay?: boolean }): Promise<ISuccessResponse> {
    const personalEvent = await this.personalEventModel.findById(eventId);
    if (!personalEvent) throw new NotFoundException('Personal event not found');
    if (personalEvent.user.toString() !== userId) throw new ForbiddenException('You can only update your own personal events');

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.eventDate !== undefined) updateData.eventDate = new Date(dto.eventDate);
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.allDay !== undefined) updateData.allDay = dto.allDay;

    const updated = await this.personalEventModel.findByIdAndUpdate(eventId, { $set: updateData }, { new: true });
    return { success: true, message: 'Personal event updated successfully', data: updated };
  }

  async deletePersonalEvent(eventId: string, userId: string): Promise<ISuccessResponse> {
    const personalEvent = await this.personalEventModel.findById(eventId);
    if (!personalEvent) throw new NotFoundException('Personal event not found');
    if (personalEvent.user.toString() !== userId) throw new ForbiddenException('You can only delete your own personal events');

    await personalEvent.deleteOne();
    return { success: true, message: 'Personal event deleted successfully', data: personalEvent };
  }

  async createEventReminder(userId: string, eventId: string, reminderDate: string, method?: string): Promise<ISuccessResponse> {
    try {
      const reminder = await this.reminderModel.create({
        user: new Types.ObjectId(userId),
        event: new Types.ObjectId(eventId),
        reminderDate: new Date(reminderDate),
        method: method ?? 'push',
      });
      return { success: true, message: 'Reminder created successfully', data: reminder };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Reminder already exists for this event');
      }
      throw error;
    }
  }

  async getEventReminders(userId: string): Promise<ISuccessResponse> {
    const items = await this.reminderModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ reminderDate: 1 })
      .populate('event', '_id name eventDateTime slug');
    return { success: true, message: 'Reminders fetched successfully', data: items };
  }

  async deleteEventReminder(reminderId: string, userId: string): Promise<ISuccessResponse> {
    const reminder = await this.reminderModel.findById(reminderId);
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.user.toString() !== userId) throw new ForbiddenException('You can only delete your own reminders');

    await reminder.deleteOne();
    return { success: true, message: 'Reminder deleted successfully', data: reminder };
  }

  async getEventAttendees(eventId: string, page?: string, limit?: string): Promise<ISuccessResponse> {
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const event = await this.eventModel.findById(eventId).select('registeredUsers');
    if (!event) throw new NotFoundException('Event not found');

    const totalItems = event.registeredUsers.length;
    const paginatedUsers = event.registeredUsers.slice(perPage * (currentPage - 1), perPage * currentPage);

    const userIds = paginatedUsers.map((u) => u.userId);

    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('_id fullName email avatarUrl membershipId');

    return {
      success: true,
      message: 'Event attendees fetched successfully',
      data: {
        items: users,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages: Math.ceil(totalItems / perPage) },
      },
    };
  }
}
