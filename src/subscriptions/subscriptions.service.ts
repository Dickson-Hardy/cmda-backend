import { Injectable } from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/users.schema';
import { Model } from 'mongoose';
import { Subscription } from './subscription.schema';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<Subscription>,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  async init(id: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id);
    const transaction = await this.paystackService.initializeTransaction({
      amount: 2500 * 100,
      email: user.email,
      channels: ['card'],
      callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=subscription',
      metadata: JSON.stringify({ name: user.fullName }),
    });
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    return {
      success: true,
      message: 'Subscription session initiated',
      data: { checkout_url: transaction.data.authorization_url },
    };
  }

  async create(
    id: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<ISuccessResponse> {
    const { reference } = createSubscriptionDto;
    const transaction = await this.paystackService.verifyTransaction(reference);
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    const { amount } = transaction.data;
    const oneYearFromNow = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year - annually
    const subscription = await this.subscriptionModel.create({
      reference,
      amount: amount / 100,
      expiryDate: oneYearFromNow,
      user: id,
    });

    const user = await this.userModel.findByIdAndUpdate(
      id,
      { subscribed: true, subscriptionExpiry: oneYearFromNow },
      { new: true },
    );

    return {
      success: true,
      message: 'Subscription saved successfully',
      data: { subscription, user },
    };
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy
      ? {
          $or: [
            { reference: new RegExp(searchBy, 'i') },
            { amount: new RegExp(searchBy, 'i') },
            { frequency: new RegExp(searchBy, 'i') },
          ],
        }
      : {};

    const donations = await this.subscriptionModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .populate('user', ['_id', 'fullName', 'email']);

    const totalItems = await this.subscriptionModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Subscription records fetched successfully',
      data: {
        items: donations,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async findUserSubs(id: string, query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = {
      user: id,
      ...(searchBy
        ? {
            $or: [
              { reference: new RegExp(searchBy, 'i') },
              { amount: new RegExp(searchBy, 'i') },
              { frequency: new RegExp(searchBy, 'i') },
            ],
          }
        : {}),
    };

    const events = await this.subscriptionModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.subscriptionModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'User subscription records fetched successfully',
      data: {
        items: events,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }
}
