import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { SupportTicket } from './support.schema';
import {
  CreateSupportDto,
  SupportQueryDto,
  SupportReplyDto,
  UpdateSupportDto,
} from './support.dto';
import { EmailService } from '../email/email.service';

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);
  constructor(
    @InjectModel(SupportTicket.name) private tickets: Model<SupportTicket>,
    private email: EmailService,
  ) {}

  hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private memberView(ticket: any) {
    return {
      reference: ticket.reference,
      kind: ticket.kind,
      category: ticket.category,
      subject: ticket.subject,
      source: ticket.source,
      status: ticket.status,
      revision: ticket.revision,
      messages: ticket.messages,
      createdAt: ticket.createdAt,
    };
  }

  private async notify(ticket: any, subject: string, text: string, trackingLink?: string) {
    try {
      const result = await this.email.sendEmail({
        to: ticket.email,
        subject: `CMDA ${ticket.reference}: ${subject}`,
        html: `<p>Hello ${escapeHtml(ticket.name)},</p><p>${escapeHtml(text)}</p><p>Reference: <strong>${escapeHtml(ticket.reference)}</strong></p>${trackingLink ? `<p><a href="${escapeHtml(trackingLink)}">View your conversation</a>. Keep this private link safe.</p>` : '<p>Use your private tracking link to view the conversation and reply.</p>'}<p>CMDA Nigeria support team</p>`,
      });
      return result.success;
    } catch {
      this.logger.warn(`Support notification could not be sent for ${ticket.reference}`);
      return false;
    }
  }

  async create(dto: CreateSupportDto) {
    const tokenHash = this.hash(dto.accessToken);
    const existing = await this.tickets
      .findOne({ submissionId: dto.submissionId })
      .select('+tokenHash');
    if (existing) {
      if (existing.tokenHash !== tokenHash)
        throw new ConflictException('Please start a new submission.');
      return { ...this.memberView(existing), duplicate: true, emailSent: false };
    }
    let ticket: SupportTicket;
    try {
      ticket = await this.tickets.create({
        reference: `CMDA-${randomBytes(8).toString('hex').toUpperCase()}`,
        submissionId: dto.submissionId,
        tokenHash,
        kind: dto.kind,
        category: dto.category,
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        source: dto.source,
        messages: [
          {
            messageId: dto.submissionId,
            author: 'member',
            message: dto.message,
            createdAt: new Date(),
          },
        ],
      });
    } catch (error) {
      if (error.code === 11000)
        throw new ConflictException(
          'This submission is already being processed. Try again to retrieve it.',
        );
      throw error;
    }
    const link = `https://cmdanigeria.net/support#${ticket.reference}:${dto.accessToken}`;
    const emailSent = await this.notify(
      ticket,
      'Submission received',
      'Your message has been saved. Our team will review it. This is not confirmation of a payment or an emergency service.',
      link,
    );
    return { ...this.memberView(ticket), emailSent, duplicate: false };
  }

  private async memberTicket(reference: string, token?: string) {
    if (!/^[a-f0-9]{64}$/.test(token || ''))
      throw new NotFoundException(
        'Conversation not found. Check your reference and private access key.',
      );
    const ticket = await this.tickets.findOne({ reference, tokenHash: this.hash(token) });
    if (!ticket)
      throw new NotFoundException(
        'Conversation not found. Check your reference and private access key.',
      );
    return ticket;
  }
  async track(reference: string, token: string) {
    return this.memberView(await this.memberTicket(reference, token));
  }

  async list(query: SupportQueryDto) {
    const filter: any = {};
    for (const key of ['status', 'kind', 'source']) if (query[key]) filter[key] = query[key];
    if (query.search?.trim()) {
      const escaped = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = ['reference', 'subject', 'email', 'name'].map((key) => ({
        [key]: { $regex: escaped, $options: 'i' },
      }));
    }
    const [items, totalItems] = await Promise.all([
      this.tickets
        .find(filter)
        .select('-messages')
        .populate('assignedTo', 'fullName')
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      this.tickets.countDocuments(filter),
    ]);
    return {
      items,
      meta: {
        totalItems,
        currentPage: query.page,
        totalPages: Math.ceil(totalItems / query.limit),
      },
    };
  }
  async detail(id: string) {
    const ticket = await this.tickets
      .findById(id)
      .select('+history +attachmentId')
      .populate('assignedTo', 'fullName')
      .lean();
    if (!ticket) throw new NotFoundException('Conversation not found.');
    const { attachmentId, ...visible } = ticket;
    return { ...visible, hasAttachment: Boolean(attachmentId) };
  }
  async update(id: string, adminId: string, dto: UpdateSupportDto) {
    const changes: any = { status: dto.status };
    if (dto.assignment !== 'keep') changes.assignedTo = dto.assignment === 'me' ? adminId : null;
    const updated = await this.tickets.findOneAndUpdate(
      { _id: id, revision: dto.version },
      {
        $set: changes,
        $inc: { revision: 1 },
        $push: {
          history: {
            adminId,
            action: `Status: ${dto.status}; assignment: ${dto.assignment}`,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    );
    if (!updated)
      throw new ConflictException('This conversation has changed. Refresh it before saving.');
    await this.notify(
      updated,
      'Status updated',
      `Your submission is now ${dto.status.replace(/_/g, ' ')}.`,
    );
    return this.detail(id);
  }
  async reply(idOrReference: string, dto: SupportReplyDto, adminId?: string, token?: string) {
    const ticket = adminId
      ? await this.tickets.findById(idOrReference)
      : await this.memberTicket(idOrReference, token);
    if (!ticket) throw new NotFoundException('Conversation not found.');
    if (ticket.messages.some((message) => message.messageId === dto.messageId))
      return adminId ? this.detail(String(ticket._id)) : this.memberView(ticket);
    if (ticket.messages.length >= 100)
      throw new BadRequestException(
        'This conversation has reached its reply limit. Please start a new submission and include this reference.',
      );
    const updated = await this.tickets.findOneAndUpdate(
      { _id: ticket._id, revision: dto.version },
      {
        $push: {
          messages: {
            messageId: dto.messageId,
            author: adminId ? 'team' : 'member',
            message: dto.message,
            createdAt: new Date(),
          },
          ...(adminId
            ? { history: { adminId, action: 'Replied to member', createdAt: new Date() } }
            : {}),
        },
        $inc: { revision: 1 },
        $set: { status: adminId ? 'awaiting_member' : 'open' },
      },
      { new: true },
    );
    if (!updated)
      throw new ConflictException('This conversation has changed. Refresh it before replying.');
    if (adminId)
      await this.notify(
        updated,
        'New reply',
        'Our team has replied. Open your private tracking link to read the response.',
      );
    return adminId ? this.detail(String(ticket._id)) : this.memberView(updated);
  }
  async upload(reference: string, token: string, file: Express.Multer.File) {
    const ticket = await this.memberTicket(reference, token);
    const png = file?.buffer?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg =
      file?.buffer?.[0] === 255 && file?.buffer?.[1] === 216 && file?.buffer?.[2] === 255;
    if (
      !file ||
      file.size > 5 * 1024 * 1024 ||
      !((png && file.mimetype === 'image/png') || (jpeg && file.mimetype === 'image/jpeg'))
    ) {
      throw new BadRequestException('Choose a JPEG or PNG screenshot up to 5 MB.');
    }
    const publicId = `cmda-support/${randomUUID()}`;
    await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { public_id: publicId, type: 'authenticated', resource_type: 'image', format: 'png' },
          (error, result) => (error ? reject(error) : resolve(result)),
        )
        .end(file.buffer);
    });
    try {
      const updated = await this.tickets.findOneAndUpdate(
        { _id: ticket._id, attachmentId: { $exists: false } },
        { $set: { attachmentId: publicId } },
        { new: true },
      );
      if (!updated)
        throw new ConflictException('A screenshot is already attached to this conversation.');
    } catch (error) {
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
      throw error;
    }
    return { message: 'Screenshot attached.' };
  }
  async attachment(id: string) {
    const ticket = await this.tickets.findById(id).select('+attachmentId');
    if (!ticket?.attachmentId) throw new NotFoundException('No screenshot is attached.');
    return {
      url: cloudinary.utils.private_download_url(ticket.attachmentId, 'png', {
        resource_type: 'image',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 300,
      }),
    };
  }
}
