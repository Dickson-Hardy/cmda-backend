import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { randomUUID } from 'crypto';
import {
  PaymentIntent,
  PaymentIntentContext,
  PaymentIntentProvider,
  PaymentIntentStatus,
} from '../payment-intents/payment-intent.schema';
import { PaymentIntentsService } from '../payment-intents/payment-intents.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';
import { Donation } from '../donations/donation.schema';
import { ZelleSettings } from './zelle-settings.schema';
import { CreateZelleDto, ReviewZelleDto, ZelleSettingsDto } from './zelle.dto';

@Injectable()
export class ZelleService {
  constructor(
    @InjectModel(ZelleSettings.name) private settings: Model<ZelleSettings>,
    @InjectModel(PaymentIntent.name) private intents: Model<PaymentIntent>,
    @InjectModel(User.name) private users: Model<User>,
    @InjectModel(Donation.name) private donations: Model<Donation>,
    private paymentIntents: PaymentIntentsService,
    private subscriptions: SubscriptionsService,
  ) {}

  async getSettings(admin = false) {
    const value = await this.settings.findOne({ key: 'zelle' }).lean();
    if (!admin && !value?.enabled) return { enabled: false };
    return {
      enabled: value?.enabled || false,
      accountName: value?.accountName || '',
      recipient: value?.recipient || '',
      instructions: value?.instructions || '',
      currency: 'USD',
    };
  }

  async saveSettings(dto: ZelleSettingsDto, adminId: string) {
    if (dto.enabled && (!dto.accountName.trim() || !dto.recipient.trim())) {
      throw new BadRequestException('Account name and Zelle email or phone number are required');
    }
    await this.settings.findOneAndUpdate(
      { key: 'zelle' },
      {
        ...dto,
        accountName: dto.accountName.trim(),
        recipient: dto.recipient.trim(),
        updatedBy: adminId,
      },
      { upsert: true, new: true, runValidators: true },
    );
    return this.getSettings(true);
  }

  async create(userId: string, dto: CreateZelleDto) {
    const user = await this.users.findById(userId);
    if (!user || user.role !== UserRole.GLOBALNETWORK)
      throw new BadRequestException('Zelle is available for Global Network members');
    const account = await this.getSettings();
    if (!account.enabled)
      throw new BadRequestException('Zelle payments are not currently available');
    if (
      dto.context === 'DONATION' &&
      dto.areasOfNeed?.length &&
      Math.round(dto.areasOfNeed.reduce((sum, area) => sum + area.amount, 0) * 100) !==
        Math.round(dto.amount * 100)
    ) {
      throw new BadRequestException('Donation allocations must match the transfer amount');
    }
    let contextData: Record<string, any> = {
      purpose: dto.purpose || 'General donation',
      account,
      ...(dto.areasOfNeed?.length ? { areasOfNeed: dto.areasOfNeed } : {}),
    };
    if (dto.context === 'SUBSCRIPTION') {
      const quote = await this.subscriptions.quoteGlobalInstallment(userId, dto);
      if (quote.progress.currency !== 'USD')
        throw new BadRequestException(
          'Zelle subscriptions are USD only. Use the GBP payment options for UK/Europe',
        );
      contextData = {
        ...contextData,
        targetYear: quote.progress.subscriptionYear,
        incomeBracket: (quote.progress as any).incomeBracket,
        annualTarget: quote.progress.annualTarget,
      };
    }
    const intent = await this.paymentIntents.createIntent({
      userId,
      email: user.email,
      amount: dto.amount,
      currency: 'USD',
      provider: PaymentIntentProvider.ZELLE,
      context: dto.context as PaymentIntentContext,
      contextData,
    });
    // Local reference is stable across uploads, reviews and retries.
    return this.paymentIntents.updateProviderReference(
      intent.id,
      `ZELLE-${intent.intentCode}`,
      PaymentIntentStatus.PENDING,
    );
  }

  async upload(userId: string, id: string, transferReference: string, file: Express.Multer.File) {
    if (transferReference.trim().length < 3)
      throw new BadRequestException('Enter a valid Zelle transaction reference');
    const intent = await this.intents.findOne({
      _id: id,
      user: userId,
      provider: 'ZELLE',
      status: { $in: ['PENDING', 'FAILED'] },
    });
    if (!intent) throw new NotFoundException('Pending Zelle payment not found');
    const jpeg =
      file?.buffer?.[0] === 0xff && file?.buffer?.[1] === 0xd8 && file?.buffer?.[2] === 0xff;
    const png = file?.buffer?.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (
      !file ||
      !((file.mimetype === 'image/jpeg' && jpeg) || (file.mimetype === 'image/png' && png)) ||
      file.size > 5 * 1024 * 1024
    ) {
      throw new BadRequestException('Upload a JPEG or PNG receipt up to 5 MB');
    }
    const publicId = `cmda-zelle-proofs/${randomUUID()}`;
    await new Promise<void>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, resource_type: 'image', type: 'authenticated', format: 'png' },
        (error, result) =>
          error || !result ? reject(error || new Error('Receipt upload failed')) : resolve(),
      );
      stream.end(file.buffer);
    });
    let updated;
    try {
      updated = await this.intents.findOneAndUpdate(
        { _id: id, user: userId, status: { $in: ['PENDING', 'FAILED'] } },
        {
          proofPublicId: publicId,
          transferReference: transferReference.trim().toUpperCase(),
          status: PaymentIntentStatus.AWAITING_REVIEW,
        },
        { new: true },
      );
    } catch (error) {
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
      if (error.code === 11000)
        throw new ConflictException('This Zelle transaction reference has already been submitted');
      throw error;
    }
    if (!updated) {
      await cloudinary.uploader.destroy(publicId, { type: 'authenticated' });
      throw new ConflictException('This payment has already been submitted');
    }
    return updated;
  }

  async list(page = 1, limit = 10, userId?: string) {
    const filter = { provider: PaymentIntentProvider.ZELLE, ...(userId ? { user: userId } : {}) };
    const [items, totalItems] = await Promise.all([
      this.intents
        .find(filter)
        .populate('user', 'fullName email membershipId')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.intents.countDocuments(filter),
    ]);
    return {
      items,
      meta: { currentPage: page, totalPages: Math.ceil(totalItems / limit), totalItems },
    };
  }

  async proof(id: string, userId?: string) {
    const intent = await this.intents
      .findOne({ _id: id, provider: 'ZELLE', ...(userId ? { user: userId } : {}) })
      .select('+proofPublicId');
    if (!intent?.proofPublicId) throw new NotFoundException('Receipt not found');
    // Expiring authenticated download; receipts are never public Cloudinary assets.
    return {
      url: cloudinary.utils.private_download_url(intent.proofPublicId, 'png', {
        resource_type: 'image',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 300,
      }),
    };
  }

  async review(id: string, adminId: string, dto: ReviewZelleDto) {
    if (dto.note.trim().length < 3)
      throw new BadRequestException('Add a review note of at least three characters');
    const intent = await this.intents.findOneAndUpdate(
      {
        _id: id,
        provider: 'ZELLE',
        $or: [
          { status: 'AWAITING_REVIEW' },
          { status: 'REVIEWING', reviewStartedAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) } },
        ],
      },
      { status: PaymentIntentStatus.REVIEWING, reviewStartedAt: new Date() },
      { new: true },
    );
    if (!intent) throw new ConflictException('Payment is already reviewed or not ready for review');
    try {
      if (dto.decision === 'reject') {
        const credited =
          intent.context === PaymentIntentContext.SUBSCRIPTION
            ? await this.subscriptions.hasZellePayment(intent.providerReference)
            : await this.donations.exists({ reference: intent.providerReference, isPaid: true });
        if (credited)
          throw new ConflictException(
            'This payment has already been credited. Approve it to finish reconciliation.',
          );
      }
      if (dto.decision === 'approve') {
        if (intent.context === PaymentIntentContext.SUBSCRIPTION)
          await this.subscriptions.recordZellePayment(intent);
        else if (intent.context === PaymentIntentContext.DONATION) {
          await this.donations.findOneAndUpdate(
            { reference: intent.providerReference },
            {
              $setOnInsert: {
                reference: intent.providerReference,
                user: intent.user,
                totalAmount: intent.amount,
                currency: 'USD',
                source: 'ZELLE',
                isPaid: true,
                recurring: false,
                areasOfNeed: intent.contextData?.areasOfNeed || [
                  {
                    name: intent.contextData?.purpose || 'General donation',
                    amount: intent.amount,
                  },
                ],
              },
            },
            { upsert: true, new: true },
          );
        } else throw new BadRequestException('Unsupported Zelle payment type');
      }
      return await this.intents.findByIdAndUpdate(
        id,
        {
          status:
            dto.decision === 'approve'
              ? PaymentIntentStatus.SUCCESSFUL
              : PaymentIntentStatus.FAILED,
          reviewNote: dto.note.trim(),
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
        { new: true },
      );
    } catch (error) {
      await this.intents.findByIdAndUpdate(id, { status: PaymentIntentStatus.AWAITING_REVIEW });
      throw error;
    }
  }
}
