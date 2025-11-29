import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import ShortUniqueId from 'short-unique-id';
import { PaymentIntent, PaymentIntentStatus } from './payment-intent.schema';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { LookupPaymentIntentDto } from './dto/lookup-payment-intent.dto';

@Injectable()
export class PaymentIntentsService {
  constructor(@InjectModel(PaymentIntent.name) private model: Model<PaymentIntent>) {}

  async createIntent(payload: CreatePaymentIntentDto): Promise<PaymentIntent> {
    const { randomUUID } = new ShortUniqueId({ length: 10, dictionary: 'alphanum_upper' });
    const intentCode = `INT-${randomUUID()}`;
    const intent = await this.model.create({
      intentCode,
      email: payload.email,
      user: payload.userId,
      amount: payload.amount,
      currency: payload.currency || 'NGN',
      provider: payload.provider,
      context: payload.context,
      contextData: payload.contextData || {},
      channel: payload.channel,
    });
    return intent;
  }

  async attachCheckoutData(intentId: string, checkoutUrl: string): Promise<PaymentIntent> {
    const intent = await this.model.findByIdAndUpdate(intentId, { checkoutUrl }, { new: true });
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async updateProviderReference(
    intentId: string,
    providerReference: string,
    status: PaymentIntentStatus = PaymentIntentStatus.PROCESSING,
  ): Promise<PaymentIntent> {
    const intent = await this.model.findByIdAndUpdate(
      intentId,
      { providerReference, status, lastSyncedAt: new Date() },
      { new: true },
    );
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async markAsSuccessful(intentId: string, providerResponse?: any): Promise<PaymentIntent> {
    const intent = await this.model.findByIdAndUpdate(
      intentId,
      {
        status: PaymentIntentStatus.SUCCESSFUL,
        providerResponse: providerResponse || undefined,
        lastSyncedAt: new Date(),
      },
      { new: true },
    );
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async markAsFailed(intentId: string, providerResponse?: any): Promise<PaymentIntent> {
    const intent = await this.model.findByIdAndUpdate(
      intentId,
      {
        status: PaymentIntentStatus.FAILED,
        providerResponse: providerResponse || undefined,
        lastSyncedAt: new Date(),
      },
      { new: true },
    );
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async linkContextEntity(intentId: string, contextEntity: string): Promise<PaymentIntent> {
    const intent = await this.model.findByIdAndUpdate(intentId, { contextEntity }, { new: true });
    if (!intent) {
      throw new NotFoundException('Payment intent not found');
    }
    return intent;
  }

  async findById(intentId: string): Promise<PaymentIntent | null> {
    return this.model.findById(intentId);
  }

  async findByCode(intentCode: string): Promise<PaymentIntent | null> {
    return this.model.findOne({ intentCode });
  }

  async findByReference(reference: string): Promise<PaymentIntent | null> {
    return this.model.findOne({ providerReference: reference });
  }

  async listForUser(userId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { user: userId };
    if (query.searchBy) {
      filter.intentCode = { $regex: query.searchBy, $options: 'i' };
    }

    const [items, totalItems] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        currentPage: page,
        totalItems,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async lookupByEmail(query: LookupPaymentIntentDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { email: query.email };
    if (query.status) {
      filter.status = query.status;
    }
    if (query.provider) {
      filter.provider = query.provider;
    }
    if (query.reference) {
      filter.providerReference = query.reference;
    }

    const [items, totalItems] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      items,
      meta: {
        currentPage: page,
        totalItems,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }
}
