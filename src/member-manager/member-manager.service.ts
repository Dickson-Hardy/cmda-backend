import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MemberNote } from './schemas/member-note.schema';
import { CommunicationLog } from './schemas/communication-log.schema';
import { FollowUp } from './schemas/follow-up.schema';
import { Ticket } from './schemas/ticket.schema';
import { EmailTemplate } from './schemas/email-template.schema';
import { Task } from './schemas/task.schema';
import { ModerationLog } from './schemas/moderation-log.schema';
import { Announcement } from './schemas/announcement.schema';
import { User } from '../users/schema/users.schema';
import { UsersService } from '../users/users.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class MemberManagerService {
  constructor(
    @InjectModel(MemberNote.name) private memberNoteModel: Model<MemberNote>,
    @InjectModel(CommunicationLog.name) private communicationLogModel: Model<CommunicationLog>,
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUp>,
    @InjectModel(Ticket.name) private ticketModel: Model<Ticket>,
    @InjectModel(EmailTemplate.name) private emailTemplateModel: Model<EmailTemplate>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(ModerationLog.name) private moderationLogModel: Model<ModerationLog>,
    @InjectModel(Announcement.name) private announcementModel: Model<Announcement>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly userService: UsersService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly emailService: EmailService,
  ) {}

  // Members
  async getAllMembers(query: any) {
    const { page = 1, limit = 20, searchBy = '', role = '', region = '', subscribed = '' } = query;

    const filter: any = {};
    if (searchBy) {
      filter.$or = [
        { fullName: { $regex: searchBy, $options: 'i' } },
        { email: { $regex: searchBy, $options: 'i' } },
        { membershipId: { $regex: searchBy, $options: 'i' } },
      ];
    }
    if (role) filter.role = role;
    if (region) filter.region = region;
    if (subscribed !== '') filter.subscribed = subscribed === 'true';

    const result = await this.userService.findAll({
      ...filter,
      limit: String(limit),
      page: String(page),
    });
    const totalItems = await this.userModel.countDocuments(filter);

    return {
      success: true,
      message: 'Members retrieved successfully',
      data: {
        items: (result.data as any).items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  async getMemberById(id: string) {
    const member = await this.userModel.findById(id);
    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Get additional data
    const [notes, communications, followUps, tickets] = await Promise.all([
      this.memberNoteModel
        .find({ memberId: id })
        .populate('createdBy', 'fullName')
        .sort({ createdAt: -1 }),
      this.communicationLogModel
        .find({ memberId: id })
        .populate('managerId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10),
      this.followUpModel.find({ memberId: id }).sort({ dueDate: -1 }),
      this.ticketModel.find({ memberId: id }).sort({ createdAt: -1 }),
    ]);

    return {
      success: true,
      message: 'Member retrieved successfully',
      data: {
        ...member.toObject(),
        notes,
        recentCommunications: communications,
        followUps,
        tickets,
      },
    };
  }

  async getMemberStats() {
    const [totalMembers, activeSubscribers, inactiveSubscribers, lifetimeMembers] =
      await Promise.all([
        this.userModel.countDocuments({}),
        this.userModel.countDocuments({ subscribed: true, hasLifetimeMembership: false }),
        this.userModel.countDocuments({ subscribed: false }),
        this.userModel.countDocuments({ hasLifetimeMembership: true }),
      ]);

    return {
      success: true,
      data: {
        totalMembers,
        activeSubscribers,
        inactiveSubscribers,
        lifetimeMembers,
      },
    };
  }

  async exportMembers(query: any) {
    // Implementation for CSV export
    const members = await this.userService.findAll(query);
    return members;
  }

  // Notes
  async getMemberNotes(memberId: string) {
    const notes = await this.memberNoteModel
      .find({ memberId })
      .populate('createdBy', 'fullName email')
      .sort({ isPinned: -1, createdAt: -1 });

    return {
      success: true,
      data: notes,
    };
  }

  async createNote(memberId: string, body: any, createdBy: string) {
    const note = await this.memberNoteModel.create({
      memberId,
      createdBy,
      content: body.content,
      category: body.category || 'general',
      isPinned: body.isPinned || false,
    });

    await note.populate('createdBy', 'fullName email');

    return {
      success: true,
      message: 'Note created successfully',
      data: note,
    };
  }

  async updateNote(noteId: string, body: any) {
    const note = await this.memberNoteModel.findByIdAndUpdate(noteId, body, { new: true });
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return {
      success: true,
      message: 'Note updated successfully',
      data: note,
    };
  }

  async deleteNote(noteId: string) {
    const note = await this.memberNoteModel.findByIdAndDelete(noteId);
    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return {
      success: true,
      message: 'Note deleted successfully',
    };
  }

  // Communications
  async getAllCommunications(query: any) {
    const { page = 1, limit = 20, type = '' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (type) filter.type = type;

    const [items, totalItems] = await Promise.all([
      this.communicationLogModel
        .find(filter)
        .populate('memberId', 'fullName email')
        .populate('managerId', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.communicationLogModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  async getMemberCommunications(memberId: string) {
    const communications = await this.communicationLogModel
      .find({ memberId })
      .populate('managerId', 'fullName')
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: communications,
    };
  }

  async logCommunication(body: any, managerId: string) {
    const communication = await this.communicationLogModel.create({
      ...body,
      managerId,
    });

    await communication.populate('memberId', 'fullName email');
    await communication.populate('managerId', 'fullName');

    return {
      success: true,
      message: 'Communication logged successfully',
      data: communication,
    };
  }

  // Follow-ups
  async getAllFollowUps(query: any) {
    const { status = '', priority = '' } = query;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const followUps = await this.followUpModel
      .find(filter)
      .populate('memberId', 'fullName email')
      .populate('assignedTo', 'fullName')
      .sort({ dueDate: 1 });

    return {
      success: true,
      data: followUps,
    };
  }

  async getMemberFollowUps(memberId: string) {
    const followUps = await this.followUpModel
      .find({ memberId })
      .populate('assignedTo', 'fullName')
      .sort({ dueDate: 1 });

    return {
      success: true,
      data: followUps,
    };
  }

  async createFollowUp(body: any, assignedTo: string) {
    const followUp = await this.followUpModel.create({
      ...body,
      assignedTo,
    });

    await followUp.populate('memberId', 'fullName email');

    return {
      success: true,
      message: 'Follow-up created successfully',
      data: followUp,
    };
  }

  async updateFollowUp(id: string, body: any) {
    const followUp = await this.followUpModel.findByIdAndUpdate(id, body, { new: true });
    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return {
      success: true,
      message: 'Follow-up updated successfully',
      data: followUp,
    };
  }

  async completeFollowUp(id: string, body: any) {
    const followUp = await this.followUpModel.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: body.completionNotes,
      },
      { new: true },
    );

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    return {
      success: true,
      message: 'Follow-up marked as completed',
      data: followUp,
    };
  }

  // Tickets
  async getAllTickets(query: any) {
    const { page = 1, limit = 20, status = '', priority = '' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const [items, totalItems] = await Promise.all([
      this.ticketModel
        .find(filter)
        .populate('memberId', 'fullName email')
        .populate('assignedTo', 'fullName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.ticketModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  async getTicketById(id: string) {
    const ticket = await this.ticketModel
      .findById(id)
      .populate('memberId', 'fullName email phone')
      .populate('assignedTo', 'fullName')
      .populate('comments.author', 'fullName');

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      success: true,
      data: ticket,
    };
  }

  async createTicket(body: any, assignedTo: string) {
    const ticket = await this.ticketModel.create({
      ...body,
      assignedTo,
    });

    await ticket.populate('memberId', 'fullName email');

    return {
      success: true,
      message: 'Ticket created successfully',
      data: ticket,
    };
  }

  async updateTicket(id: string, body: any) {
    const ticket = await this.ticketModel.findByIdAndUpdate(id, body, { new: true });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    };
  }

  async addTicketComment(ticketId: string, body: any, author: string) {
    const ticket = await this.ticketModel.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    ticket.comments.push({
      author,
      content: body.content,
      createdAt: new Date(),
    } as any);

    await ticket.save();
    await ticket.populate('comments.author', 'fullName');

    return {
      success: true,
      message: 'Comment added successfully',
      data: ticket,
    };
  }

  // Subscriptions
  async activateSubscription() {
    // TODO: Implement subscription activation
    throw new Error('Method not implemented: activateUserSubscription');
  }

  async activateLifetimeMembership(userId: string, body: any) {
    return this.subscriptionsService.activateLifetime(userId, body.isNigerian, body.lifetimeType);
  }

  // Email Templates
  async getAllEmailTemplates(query: any) {
    const { category = '', isActive = '' } = query;

    const filter: any = {};
    if (category) filter.category = category;
    if (isActive !== '') filter.isActive = isActive === 'true';

    const templates = await this.emailTemplateModel
      .find(filter)
      .populate('createdBy', 'fullName')
      .populate('lastModifiedBy', 'fullName')
      .sort({ createdAt: -1 });

    return {
      success: true,
      data: templates,
    };
  }

  async getEmailTemplateById(id: string) {
    const template = await this.emailTemplateModel
      .findById(id)
      .populate('createdBy', 'fullName email')
      .populate('lastModifiedBy', 'fullName email');

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return {
      success: true,
      data: template,
    };
  }

  async createEmailTemplate(body: any, createdBy: string) {
    const template = await this.emailTemplateModel.create({
      ...body,
      createdBy,
    });

    await template.populate('createdBy', 'fullName');

    return {
      success: true,
      message: 'Email template created successfully',
      data: template,
    };
  }

  async updateEmailTemplate(id: string, body: any, modifiedBy: string) {
    const template = await this.emailTemplateModel.findByIdAndUpdate(
      id,
      { ...body, lastModifiedBy: modifiedBy },
      { new: true },
    );

    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return {
      success: true,
      message: 'Email template updated successfully',
      data: template,
    };
  }

  async deleteEmailTemplate(id: string) {
    const template = await this.emailTemplateModel.findByIdAndDelete(id);
    if (!template) {
      throw new NotFoundException('Email template not found');
    }

    return {
      success: true,
      message: 'Email template deleted successfully',
    };
  }

  // Bulk Email
  async sendBulkEmail(body: any, managerId: string) {
    let recipients = [];

    // Get recipients based on filters or specific IDs
    if (body.sendToAll) {
      const result = await this.userService.findAll({ limit: '10000', page: '1' });
      recipients = (result.data as any).items;
    } else if (body.recipientIds && body.recipientIds.length > 0) {
      // Find users by IDs
      recipients = await this.userModel.find({ _id: { $in: body.recipientIds } }).lean();
    } else {
      // Build filter based on provided criteria
      const query: any = { limit: '10000', page: '1' };
      if (body.role) query.role = body.role;
      if (body.region) query.region = body.region;

      const result = await this.userService.findAll(query);
      recipients = (result.data as any).items;

      // Additional filtering for subscription status
      if (body.isSubscribed !== undefined) {
        recipients = recipients.filter((r) => r.subscribed === body.isSubscribed);
      }
      if (body.membershipType) {
        recipients = recipients.filter((r) => r.lifetimeType === body.membershipType);
      }
    }

    // Get email content
    let subject = body.subject;
    let emailBody = body.body;

    if (body.templateId) {
      const template = await this.emailTemplateModel.findById(body.templateId);
      if (!template) {
        throw new NotFoundException('Email template not found');
      }
      subject = template.subject;
      emailBody = template.body;

      // Increment usage count
      await this.emailTemplateModel.findByIdAndUpdate(body.templateId, {
        $inc: { usageCount: 1 },
      });
    }

    // Send emails
    const results = {
      total: recipients.length,
      sent: 0,
      failed: 0,
      errors: [],
    };

    for (const recipient of recipients) {
      try {
        // Replace variables in subject and body
        let personalizedSubject = subject;
        let personalizedBody = emailBody;

        if (recipient.fullName) {
          personalizedSubject = personalizedSubject.replace(
            /{{firstName}}/g,
            recipient.fullName.split(' ')[0],
          );
          personalizedSubject = personalizedSubject.replace(/{{fullName}}/g, recipient.fullName);
          personalizedBody = personalizedBody.replace(
            /{{firstName}}/g,
            recipient.fullName.split(' ')[0],
          );
          personalizedBody = personalizedBody.replace(/{{fullName}}/g, recipient.fullName);
        }
        if (recipient.membershipType) {
          personalizedBody = personalizedBody.replace(
            /{{membershipType}}/g,
            recipient.membershipType,
          );
        }
        if (recipient.lifetimeType) {
          personalizedBody = personalizedBody.replace(/{{lifetimeType}}/g, recipient.lifetimeType);
        }

        await this.emailService.sendEmail({
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedBody,
        });

        // Log communication
        await this.communicationLogModel.create({
          memberId: recipient._id,
          managerId,
          type: 'email',
          subject: personalizedSubject,
          content: personalizedBody,
          direction: 'outgoing',
          status: 'sent',
        });

        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          email: recipient.email,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Bulk email sent to ${results.sent} recipients`,
      data: results,
    };
  }

  // Tasks
  async getAllTasks(query: any) {
    const { page = 1, limit = 20, status = '', priority = '', category = '' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const [items, totalItems] = await Promise.all([
      this.taskModel
        .find(filter)
        .populate('memberId', 'fullName email')
        .populate('assignedTo', 'fullName')
        .sort({ dueDate: 1, priority: -1 })
        .skip(skip)
        .limit(limit),
      this.taskModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  async getTaskById(id: string) {
    const task = await this.taskModel
      .findById(id)
      .populate('memberId', 'fullName email phone')
      .populate('assignedTo', 'fullName email');

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      success: true,
      data: task,
    };
  }

  async getMemberTasks(memberId: string) {
    const tasks = await this.taskModel
      .find({ memberId })
      .populate('assignedTo', 'fullName')
      .sort({ dueDate: 1 });

    return {
      success: true,
      data: tasks,
    };
  }

  async createTask(body: any, assignedTo: string) {
    const task = await this.taskModel.create({
      ...body,
      assignedTo,
    });

    await task.populate('memberId', 'fullName email');

    return {
      success: true,
      message: 'Task created successfully',
      data: task,
    };
  }

  async updateTask(id: string, body: any) {
    const task = await this.taskModel.findByIdAndUpdate(id, body, { new: true });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      success: true,
      message: 'Task updated successfully',
      data: task,
    };
  }

  async completeTask(id: string, body: any) {
    const task = await this.taskModel.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: body.completionNotes,
        actualHours: body.actualHours || 0,
      },
      { new: true },
    );

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      success: true,
      message: 'Task marked as completed',
      data: task,
    };
  }

  async deleteTask(id: string) {
    const task = await this.taskModel.findByIdAndDelete(id);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }

  // Analytics & Reports
  async getDetailedAnalytics(query: any) {
    const { startDate, endDate } = query;

    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const [memberStats, taskStats, ticketStats, followUpStats, communicationStats, recentActivity] =
      await Promise.all([
        // Member statistics
        this.userModel.aggregate([
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              subscribed: { $sum: { $cond: ['$subscribed', 1, 0] } },
              lifetime: { $sum: { $cond: ['$hasLifetimeMembership', 1, 0] } },
            },
          },
        ]),

        // Task statistics
        this.taskModel.aggregate([
          ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // Ticket statistics
        this.ticketModel.aggregate([
          ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // Follow-up statistics
        this.followUpModel.aggregate([
          ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),

        // Communication statistics
        this.communicationLogModel.aggregate([
          ...(Object.keys(dateFilter).length ? [{ $match: { createdAt: dateFilter } }] : []),
          {
            $group: {
              _id: '$type',
              count: { $sum: 1 },
            },
          },
        ]),

        // Recent activity
        this.communicationLogModel
          .find(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
          .populate('memberId', 'fullName')
          .populate('managerId', 'fullName')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

    return {
      success: true,
      data: {
        members: memberStats[0] || { total: 0, subscribed: 0, lifetime: 0 },
        tasks: this.aggregateToObject(taskStats),
        tickets: this.aggregateToObject(ticketStats),
        followUps: this.aggregateToObject(followUpStats),
        communications: this.aggregateToObject(communicationStats),
        recentActivity,
      },
    };
  }

  private aggregateToObject(data: any[]) {
    return data.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  async getTaskAnalytics() {
    const [totalTasks, tasksByStatus, tasksByPriority, tasksByCategory, overdueTasks] =
      await Promise.all([
        this.taskModel.countDocuments(),
        this.taskModel.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]),
        this.taskModel.aggregate([
          {
            $group: {
              _id: '$priority',
              count: { $sum: 1 },
            },
          },
        ]),
        this.taskModel.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
            },
          },
        ]),
        this.taskModel.countDocuments({
          status: { $in: ['pending', 'in-progress'] },
          dueDate: { $lt: new Date() },
        }),
      ]);

    return {
      success: true,
      data: {
        totalTasks,
        byStatus: this.aggregateToObject(tasksByStatus),
        byPriority: this.aggregateToObject(tasksByPriority),
        byCategory: this.aggregateToObject(tasksByCategory),
        overdueTasks,
      },
    };
  }

  // CSV Export
  async exportMembersToCSV(query: any) {
    const { role = '', region = '', subscribed = '' } = query;

    const queryObj: any = { limit: 10000, page: 1 };
    if (role) queryObj.role = role;
    if (region) queryObj.region = region;

    const result = await this.userService.findAll(queryObj);
    let members = (result.data as any).items;

    // Additional filtering
    if (subscribed !== '') {
      members = members.filter((m) => m.subscribed === (subscribed === 'true'));
    }

    // Transform to CSV format
    const csvData = members.map((member) => ({
      'Member ID': member.membershipId || '',
      'Full Name': member.fullName || '',
      Email: member.email || '',
      Phone: member.phone || '',
      Role: member.role || '',
      Region: member.region || '',
      Specialty: member.specialty || '',
      Subscribed: member.subscribed ? 'Yes' : 'No',
      'Lifetime Member': member.hasLifetimeMembership ? 'Yes' : 'No',
      'Membership Type': member.lifetimeType || '',
      'Subscription Expires': member.subscriptionExpiryDate
        ? new Date(member.subscriptionExpiryDate).toLocaleDateString()
        : '',
      'Joined Date': member.createdAt ? new Date(member.createdAt).toLocaleDateString() : '',
    }));

    return {
      success: true,
      data: csvData,
      count: csvData.length,
    };
  }

  // Manual Member Creation
  async createMemberManually(body: any, createdBy: string) {
    const result = await this.userService.createMember(body);
    const newMember = result.data as any;

    // Log the creation
    await this.communicationLogModel.create({
      memberId: newMember._id,
      managerId: createdBy,
      type: 'manual_creation',
      subject: 'Member Manually Created',
      content: 'Member account was manually created by member manager',
      status: 'sent',
    });

    return {
      success: true,
      message: 'Member created successfully',
      data: newMember,
    };
  }

  // Ban/Deactivate Member
  async banMember(memberId: string, body: any, bannedBy: string) {
    const member = await this.userModel.findByIdAndUpdate(
      memberId,
      {
        isBanned: body.isBanned,
        bannedReason: body.reason,
        bannedBy: bannedBy,
        bannedAt: body.isBanned ? new Date() : null,
        isActive: !body.isBanned,
      },
      { new: true },
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Log the action
    await this.communicationLogModel.create({
      memberId,
      managerId: bannedBy,
      type: 'moderation',
      subject: body.isBanned ? 'Member Banned' : 'Member Unbanned',
      content: body.reason,
      status: 'sent',
    });

    // Send email notification to member
    if (body.isBanned) {
      await this.emailService.sendEmail({
        to: member.email,
        subject: 'Account Status Update',
        html: `
          <p>Dear ${member.fullName},</p>
          <p>Your account has been temporarily suspended.</p>
          <p><strong>Reason:</strong> ${body.reason}</p>
          <p>If you believe this is an error, please contact support.</p>
        `,
      });
    }

    return {
      success: true,
      message: body.isBanned ? 'Member banned successfully' : 'Member unbanned successfully',
      data: member,
    };
  }

  async deactivateMember(memberId: string, body: any) {
    const member = await this.userModel.findByIdAndUpdate(
      memberId,
      {
        isActive: body.isActive,
      },
      { new: true },
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return {
      success: true,
      message: body.isActive ? 'Member activated successfully' : 'Member deactivated successfully',
      data: member,
    };
  }

  // Member Verification
  async verifyMember(memberId: string, body: any, verifiedBy: string) {
    const member = await this.userModel.findByIdAndUpdate(
      memberId,
      {
        isVerified: body.isVerified,
        verificationDate: body.isVerified ? new Date() : null,
        verifiedBy: body.isVerified ? verifiedBy : null,
      },
      { new: true },
    );

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Log verification
    await this.communicationLogModel.create({
      memberId,
      managerId: verifiedBy,
      type: 'verification',
      subject: body.isVerified ? 'Member Verified' : 'Verification Revoked',
      content: body.notes || 'Member verification status updated',
      status: 'sent',
    });

    // Send welcome email if verified
    if (body.isVerified) {
      // Send email with instructions to update profile and download materials
      await this.emailService.sendEmail({
        to: member.email,
        subject: 'Welcome to CMDA - Complete Your Profile',
        html: `
          <p>Dear ${member.fullName},</p>
          <p>Congratulations! Your membership has been verified.</p>
          <p>Please complete the following steps:</p>
          <ol>
            <li>Update your profile with complete information</li>
            <li>Download welcome materials from the member portal</li>
            <li>Connect with your chapter leaders</li>
          </ol>
          <p>Welcome to the CMDA family!</p>
        `,
      });
    }

    return {
      success: true,
      message: body.isVerified ? 'Member verified successfully' : 'Verification revoked',
      data: member,
    };
  }

  async getPendingVerifications(query: any) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const filter = { isVerified: false, emailVerified: true };

    const [items, totalItems] = await Promise.all([
      this.userModel
        .find(filter)
        .select('fullName email phone role region referee refereeEmail createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.userModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  // Content Moderation - Placeholder methods that will interact with content modules
  async getReportedContent(_query: any) {
    // This would need implementation based on reporting system
    return {
      success: true,
      data: {
        items: [],
        meta: { totalItems: 0 },
      },
    };
  }

  async moderateContent(body: any, moderatedBy: string) {
    const moderationLog = await this.moderationLogModel.create({
      ...body,
      moderatedBy,
    });

    // Perform the actual moderation action on the content
    // This would require implementing hide/remove logic in respective modules

    return {
      success: true,
      message: 'Content moderated successfully',
      data: moderationLog,
    };
  }

  async getModerationLogs(query: any) {
    const { page = 1, limit = 20, contentType = '' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (contentType) filter.contentType = contentType;

    const [items, totalItems] = await Promise.all([
      this.moderationLogModel
        .find(filter)
        .populate('moderatedBy', 'fullName email')
        .populate('contentOwnerId', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.moderationLogModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  // Announcements/Pop-ups
  async getAllAnnouncements(query: any) {
    const { page = 1, limit = 20, isActive = '' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (isActive !== '') filter.isActive = isActive === 'true';

    const [items, totalItems] = await Promise.all([
      this.announcementModel
        .find(filter)
        .populate('createdBy', 'fullName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.announcementModel.countDocuments(filter),
    ]);

    return {
      success: true,
      data: {
        items,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
          perPage: limit,
        },
      },
    };
  }

  async getAnnouncementById(id: string) {
    const announcement = await this.announcementModel
      .findById(id)
      .populate('createdBy', 'fullName email');

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return {
      success: true,
      data: announcement,
    };
  }

  async createAnnouncement(body: any, createdBy: string) {
    const announcement = await this.announcementModel.create({
      ...body,
      createdBy,
    });

    await announcement.populate('createdBy', 'fullName email');

    return {
      success: true,
      message: 'Announcement created successfully',
      data: announcement,
    };
  }

  async updateAnnouncement(id: string, body: any) {
    const announcement = await this.announcementModel
      .findByIdAndUpdate(id, body, { new: true })
      .populate('createdBy', 'fullName email');

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return {
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    };
  }

  async deleteAnnouncement(id: string) {
    const announcement = await this.announcementModel.findByIdAndDelete(id);

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return {
      success: true,
      message: 'Announcement deleted successfully',
    };
  }

  // Financial Reports - Comprehensive transaction history
  async getFinancialReports(query: any) {
    const { page = 1, limit = 20, startDate = '', endDate = '' } = query;

    const dateFilter: any = {};

    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // This would aggregate data from subscriptions, donations, events, orders
    // For now, returning subscriptions as example
    const subscriptions = await this.subscriptionsService.findAll({
      page,
      limit,
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
    });

    return {
      success: true,
      data: subscriptions,
    };
  }

  async exportFinancialData(query: any) {
    // Aggregate financial data from all sources
    const reports = await this.getFinancialReports({ ...query, limit: 10000 });

    const csvData = Array.isArray(reports.data)
      ? reports.data.map((item: any) => ({
          Date: new Date(item.createdAt).toLocaleDateString(),
          'Member ID': item.user?.membershipId || '',
          'Member Name': item.user?.fullName || '',
          Type: item.type || 'Subscription',
          Amount: item.amount || 0,
          Status: item.status || 'completed',
          Reference: item.reference || '',
        }))
      : [];

    return {
      success: true,
      data: csvData,
      count: csvData.length,
    };
  }

  // Member Communications (Private Messages)
  async getMemberChats() {
    // This would integrate with ChatsModule
    // Placeholder implementation
    return {
      success: true,
      data: {
        items: [],
        meta: { totalItems: 0 },
      },
    };
  }
}
