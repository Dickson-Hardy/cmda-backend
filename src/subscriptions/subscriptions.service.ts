import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schema/users.schema';
import { Model } from 'mongoose';
import { Subscription } from './subscription.schema';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { SUBSCRIPTION_PRICES } from './subscription.constant';
import { json2csv } from 'json-2-csv';
import { SubscriptionPaginationQueryDto } from './dto/subscription-pagination.dto';
import { EmailService } from '../email/email.service';
import { UserRole } from '../users/user.constant';
import { PaypalService } from '../paypal/paypal.service';
import { PipelineStage } from 'mongoose';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    private paystackService: PaystackService,
    private paypalService: PaypalService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async init(id: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id);
    const amount =
      user.role === UserRole.DOCTOR && user.yearsOfExperience?.toLowerCase()?.includes('above')
        ? SUBSCRIPTION_PRICES['DoctorSenior']
        : SUBSCRIPTION_PRICES[user.role];

    let transaction: any;
    if (user.role === UserRole.GLOBALNETWORK) {
      transaction = await this.paypalService.createOrder({
        amount,
        currency: 'USD',
        description: 'SUBSCRIPTION',
        metadata: JSON.stringify({ memId: user.membershipId, name: user.fullName }),
        items: [{ name: 'Annual Subscription CMDA Nigeria', quantity: 1, amount }],
      });
    } else {
      transaction = await this.paystackService.initializeTransaction({
        amount: amount * 100,
        email: user.email,
        callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=subscription',
        metadata: JSON.stringify({
          name: user.fullName,
          memId: user.membershipId,
          currency: 'NGN',
        }),
      });
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
    }
    return {
      success: true,
      message: 'Subscription session initiated',
      data:
        user.role === UserRole.GLOBALNETWORK
          ? transaction
          : { checkout_url: transaction.data.authorization_url },
    };
  }

  async create(
    id: string,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<ISuccessResponse> {
    const { reference, source } = createSubscriptionDto;

    const alreadyExist = await this.subscriptionModel.findOne({ reference });
    if (alreadyExist) {
      throw new ConflictException('Subscription with this reference has already been confirmed');
    }

    let user: User;
    let subscription: Subscription;
    const oneYearFromNow = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year - annually

    if (source && source?.toLowerCase() === 'paypal') {
      const transaction = await this.paypalService.captureOrder(reference);

      if (transaction?.status !== 'COMPLETED') {
        throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
      }
      const details = transaction.purchase_units[0].payments.captures[0];

      const { amount, custom_id } = details; // { currency_code, value },

      let metadata: any = await Buffer.from(custom_id, 'base64').toString('utf-8');
      metadata = JSON.parse(metadata);
      const { memId } = metadata;

      user = await this.userModel.findOne({ membershipId: memId });

      subscription = await this.subscriptionModel.create({
        reference,
        amount: +amount.value,
        expiryDate: oneYearFromNow,
        user: user._id,
        currency: amount.currency_code,
        source: 'PAYPAL',
      });
    } else {
      const transaction = await this.paystackService.verifyTransaction(reference);

      if (!transaction.status) throw new Error(transaction.message);

      const {
        amount,
        metadata: { memId, currency },
      } = transaction.data;

      user = await this.userModel.findOne({ membershipId: memId });

      subscription = await this.subscriptionModel.create({
        reference,
        amount: amount / 100,
        expiryDate: oneYearFromNow,
        user: user._id,
        currency,
        source: 'PAYSTACK',
      });
    }

    user = await this.userModel.findByIdAndUpdate(
      id,
      { subscribed: true, subscriptionExpiry: oneYearFromNow },
      { new: true },
    );

    const res = await this.emailService.sendSubscriptionConfirmedEmail({
      name: user.fullName,
      email: user.email,
    });

    if (!res.success) {
      throw new InternalServerErrorException(
        'Subscription confirmed. Error occured while sending email',
      );
    }

    return {
      success: true,
      message: 'Subscription saved successfully',
      data: { subscription, user },
    };
  }

  async activate(userId: string, subDate: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(userId);
    const amount =
      user.role === UserRole.DOCTOR && user.yearsOfExperience?.toLowerCase()?.includes('above')
        ? SUBSCRIPTION_PRICES['DoctorSenior']
        : SUBSCRIPTION_PRICES[user.role];

    const oneYearFromNow = new Date(
      new Date(subDate).setFullYear(new Date(subDate).getFullYear() + 1),
    ); // 1 year - annually
    const subscription = await this.subscriptionModel.create({
      reference: 'ADMIN',
      amount: amount,
      expiryDate: oneYearFromNow,
      user: userId,
      currency: user.role === UserRole.GLOBALNETWORK ? 'USD' : 'NGN',
    });

    await this.userModel.findByIdAndUpdate(
      userId,
      { subscribed: true, subscriptionExpiry: oneYearFromNow },
      { new: true },
    );

    const res = await this.emailService.sendSubscriptionConfirmedEmail({
      name: user.fullName,
      email: user.email,
    });

    if (!res.success) {
      throw new InternalServerErrorException(
        'Subscription confirmed. Error occured while sending email',
      );
    }

    return {
      success: true,
      message: 'Subscription saved successfully',
      data: { subscription, user },
    };
  }

  async findAll(query: SubscriptionPaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, role, region } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const searchCriteria: any = {};

    if (searchBy) {
      searchCriteria.$or = [
        { reference: { $regex: searchBy, $options: 'i' } },
        { amount: { $regex: searchBy, $options: 'i' } },
        { frequency: { $regex: searchBy, $options: 'i' } },
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: searchCriteria },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      {
        $match: {
          $and: [role ? { 'user.role': role } : {}, region ? { 'user.region': region } : {}],
        },
      },
      {
        $project: {
          //  hide these
          'user.password': 0,
          'user.verificationCode': 0,
          'user.eventsRegistered': 0,
          'user.volunteerships': 0,
        },
      },
    ];

    const paginationCriteria: any = [
      { $sort: { createdAt: -1 } },
      { $skip: (currentPage - 1) * perPage },
      { $limit: perPage },
    ];

    const aggregatedSubscriptions = await this.subscriptionModel.aggregate(
      pipeline.concat(paginationCriteria),
    );

    let totalItems: any = await this.subscriptionModel.aggregate(pipeline);
    totalItems = totalItems.length;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Subscription records fetched successfully',
      data: {
        items: aggregatedSubscriptions,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async exportAll(userId: string): Promise<any> {
    const subscriptions = await this.subscriptionModel
      .find(userId ? { user: userId } : {})
      .sort({ createdAt: -1 })
      .populate('user', ['_id', 'fullName', 'email', 'role', 'region'])
      .lean();

    const subscriptionsJson = subscriptions.map((sub: any) => ({
      reference: sub.reference,
      amount: sub.amount,
      name: sub.user.fullName,
      email: sub.user.email,
      role: sub.user.role,
      region: sub.user.region,
      paidOn: new Date(sub.createdAt).toLocaleString('en-US', { dateStyle: 'medium' }),
      expiresOn: new Date(sub.expiryDate).toLocaleString('en-US', { dateStyle: 'medium' }),
    }));

    const csv = await json2csv(subscriptionsJson);

    return csv;
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

  async getStats(): Promise<ISuccessResponse> {
    const totalSubscribers = await this.userModel.countDocuments();
    const activeSubscribers = await this.userModel.countDocuments({ subscribed: true });
    const inActiveSubscribers = await this.userModel.countDocuments({ subscribed: false });

    const today = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${today}T00:00:00+01:00`);
    const endOfToday = new Date(`${today}T23:59:59+01:00`);
    const todaySubscribers = await this.subscriptionModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    return {
      success: true,
      message: 'Subscription statistics calculated successfully',
      data: {
        totalSubscribers,
        activeSubscribers,
        inActiveSubscribers,
        todaySubscribers,
      },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const subscription = await this.subscriptionModel
      .findById(id)
      .populate('user', '_id fullName email role');

    if (!subscription) {
      throw new NotFoundException('Subscription with such id does not exist');
    }
    return {
      success: true,
      message: 'Subscription fetched successfully',
      data: subscription,
    };
  }
}
