import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schema/users.schema';
import { Model, Types } from 'mongoose';
import { Subscription } from './subscription.schema';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import {
  SUBSCRIPTION_PRICES,
  GLOBAL_INCOME_BASED_PRICING,
  LIFETIME_MEMBERSHIPS,
} from './subscription.constant';
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

  async init(id: string, subscriptionData?: any): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id);
    let amount: number;
    let frequency = 'Annually';
    let isLifetime = false;
    let lifetimeType: string | undefined;
    let incomeBracket: string | undefined;

    // Handle Global Network members with income-based pricing or lifetime memberships
    if (user.role === UserRole.GLOBALNETWORK && subscriptionData) {
      if (subscriptionData.selectedTab === 'lifetime') {
        // Lifetime membership
        const lifetimePlan = LIFETIME_MEMBERSHIPS[subscriptionData.lifetimeType];
        amount = lifetimePlan.price;
        isLifetime = true;
        lifetimeType = subscriptionData.lifetimeType;
      } else if (subscriptionData.selectedTab === 'donations') {
        // Vision Partner (donations)
        amount = +subscriptionData.donationAmount;
        frequency = 'Monthly';
        incomeBracket = subscriptionData.incomeBracket;
      } else {
        // Regular subscription with income-based pricing
        const incomeBracketData = GLOBAL_INCOME_BASED_PRICING[subscriptionData.incomeBracket];
        amount = incomeBracketData[subscriptionData.paymentFrequency];
        frequency = subscriptionData.paymentFrequency === 'monthly' ? 'Monthly' : 'Annually';
        incomeBracket = subscriptionData.incomeBracket;
      }
    } else {
      // Standard pricing for other roles
      amount =
        user.role === UserRole.DOCTOR && user.yearsOfExperience?.toLowerCase()?.includes('above')
          ? SUBSCRIPTION_PRICES['DoctorSenior']
          : SUBSCRIPTION_PRICES[user.role];
    }

    let transaction: any;
    if (user.role === UserRole.GLOBALNETWORK) {
      // Determine the appropriate PayPal description type
      const paypalDescription: 'DONATION' | 'SUBSCRIPTION' =
        subscriptionData?.selectedTab === 'donations' ? 'DONATION' : 'SUBSCRIPTION';

      const orderData = {
        amount,
        currency: 'USD',
        description: paypalDescription,
        metadata: JSON.stringify({
          memId: user.membershipId,
          name: user.fullName,
          incomeBracket,
          isLifetime,
          lifetimeType,
          frequency,
          selectedTab: subscriptionData?.selectedTab,
        }),
        items: [
          {
            name: isLifetime
              ? `CMDA Nigeria ${LIFETIME_MEMBERSHIPS[lifetimeType]?.label}`
              : subscriptionData?.selectedTab === 'donations'
                ? 'CMDA Nigeria Vision Partner'
                : `CMDA Nigeria ${frequency} Subscription`,
            quantity: 1,
            amount,
          },
        ],
      };

      transaction = await this.paypalService.createOrder(orderData);
    } else {
      transaction = await this.paystackService.initializeTransaction({
        amount: amount * 100,
        email: user.email,
        callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=subscription',
        metadata: JSON.stringify({
          desc: 'SUBSCRIPTION',
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
  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<ISuccessResponse> {
    const { reference, source } = createSubscriptionDto;

    const alreadyExist = await this.subscriptionModel.findOne({ reference });
    if (alreadyExist) {
      throw new ConflictException('Subscription with this reference has already been confirmed');
    }

    let user: User;
    let subscription: Subscription;
    let expiryDate: Date;

    if (source && source?.toLowerCase() === 'paypal') {
      const transaction = await this.paypalService.captureOrder(reference);

      if (transaction?.status !== 'COMPLETED') {
        throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
      }
      const details = transaction.purchase_units[0].payments.captures[0];

      const { amount, custom_id } = details;

      let metadata: any = await Buffer.from(custom_id, 'base64').toString('utf-8');
      metadata = JSON.parse(metadata);
      const { memId, isLifetime, lifetimeType, frequency, incomeBracket, selectedTab } = metadata;

      user = await this.userModel.findOne({ membershipId: memId });

      // Calculate expiry date based on subscription type
      if (isLifetime) {
        const lifetimePlan = LIFETIME_MEMBERSHIPS[lifetimeType];
        expiryDate = new Date(
          new Date().setFullYear(new Date().getFullYear() + lifetimePlan.years),
        );
      } else if (frequency === 'Monthly') {
        expiryDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
      } else {
        expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));
      }

      subscription = await this.subscriptionModel.create({
        reference,
        amount: +amount.value,
        expiryDate,
        user: user._id,
        currency: amount.currency_code,
        source: 'PAYPAL',
        frequency: frequency || 'Annually',
        incomeBracket,
        isLifetime: isLifetime || false,
        lifetimeType,
        isVisionPartner: selectedTab === 'donations',
      });

      // Update user fields for Global Network members
      if (user.role === UserRole.GLOBALNETWORK) {
        const updateData: any = {
          subscribed: true,
          subscriptionExpiry: expiryDate,
        };

        if (incomeBracket) {
          updateData.incomeBracket = incomeBracket;
        }

        if (isLifetime) {
          updateData.hasLifetimeMembership = true;
          updateData.lifetimeMembershipType = lifetimeType;
          updateData.lifetimeMembershipExpiry = expiryDate;
        }

        user = await this.userModel.findByIdAndUpdate(user._id, updateData, { new: true });
      } else {
        user = await this.userModel.findByIdAndUpdate(
          user._id,
          { subscribed: true, subscriptionExpiry: expiryDate },
          { new: true },
        );
      }
    } else {
      const transaction = await this.paystackService.verifyTransaction(reference);

      if (!transaction.status) throw new Error(transaction.message);

      const {
        amount,
        metadata: { memId, currency },
      } = transaction.data;

      user = await this.userModel.findOne({ membershipId: memId });
      expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

      subscription = await this.subscriptionModel.create({
        reference,
        amount: amount / 100,
        expiryDate,
        user: user._id,
        currency,
        source: 'PAYSTACK',
      });

      user = await this.userModel.findByIdAndUpdate(
        user._id,
        { subscribed: true, subscriptionExpiry: expiryDate },
        { new: true },
      );
    }

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
      const searchNumber = Number(searchBy);
      searchCriteria.$or = [
        { reference: { $regex: searchBy, $options: 'i' } },
        !isNaN(searchNumber) ? { amount: searchNumber } : false,
      ].filter(Boolean);
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

  async exportAll(query: SubscriptionPaginationQueryDto): Promise<any> {
    const { searchBy, role, region, userId } = query;

    const searchCriteria: any = {};

    if (searchBy) {
      const searchNumber = Number(searchBy);
      searchCriteria.$or = [
        { reference: { $regex: searchBy, $options: 'i' } },
        !isNaN(searchNumber) ? { amount: searchNumber } : false,
      ].filter(Boolean);
    }

    if (userId) {
      searchCriteria.user = new Types.ObjectId(userId);
    }

    const pipeline: PipelineStage[] = [
      { $match: searchCriteria },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $match: {
          $and: [role ? { 'user.role': role } : {}, region ? { 'user.region': region } : {}],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          _id: 0,
          SOURCE: { $ifNull: ['$source', 'N/A'] },
          REFERENCE: '$reference',
          CURRENCY: '$currency',
          AMOUNT: '$amount',
          NAME: { $ifNull: ['$user.fullName', 'N/A'] },
          EMAIL: { $ifNull: ['$user.email', 'N/A'] },
          ROLE: { $ifNull: ['$user.role', 'N/A'] },
          REGION: { $ifNull: ['$user.region', 'N/A'] },
          PAID_ON: {
            $dateToString: { format: '%d-%b-%Y', date: '$createdAt' },
          },
          EXPIRES_ON: {
            $dateToString: { format: '%d-%b-%Y', date: '$expiryDate' },
          },
        },
      },
    ];

    const subscriptions = await this.subscriptionModel.aggregate(pipeline);

    const csv = await json2csv(subscriptions);

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
            $or: [{ reference: new RegExp(searchBy, 'i') }, { amount: new RegExp(searchBy, 'i') }],
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
  async syncPaymentStatus(userId: string, reference: string): Promise<ISuccessResponse> {
    try {
      // Check if subscription already exists with this reference
      const existingSubscription = await this.subscriptionModel.findOne({
        reference,
        user: userId,
      });

      if (existingSubscription) {
        return {
          success: true,
          message: 'Subscription payment is already confirmed',
          data: existingSubscription,
        };
      }

      // Get user details
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Verify payment with payment provider
      let transaction: any;
      let source = 'PAYSTACK';

      try {
        // Try Paystack first
        transaction = await this.paystackService.verifyTransaction(reference);
        if (!transaction.status) {
          // If Paystack fails, try PayPal for global network users
          if (user.role === UserRole.GLOBALNETWORK) {
            try {
              transaction = await this.paypalService.captureOrder(reference);
              source = 'PAYPAL';
              if (transaction?.status !== 'COMPLETED') {
                throw new Error('Payment verification failed with both providers');
              }
            } catch (paypalError) {
              throw new Error('Payment verification failed with both providers');
            }
          } else {
            throw new Error('Payment verification failed - transaction not successful');
          }
        }
      } catch (error) {
        throw new Error('Payment verification failed - unable to verify with payment providers');
      }

      // Create subscription record based on payment provider
      let newSubscription: Subscription;
      const oneYearFromNow = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

      if (source === 'PAYPAL') {
        const details = transaction.purchase_units[0].payments.captures[0];
        const { amount } = details;

        newSubscription = await this.subscriptionModel.create({
          reference,
          amount: +amount.value,
          expiryDate: oneYearFromNow,
          user: userId,
          currency: amount.currency_code,
          source: 'PAYPAL',
        });
      } else {
        const { amount, metadata } = transaction.data;

        newSubscription = await this.subscriptionModel.create({
          reference,
          amount: amount / 100,
          expiryDate: oneYearFromNow,
          user: userId,
          currency: metadata?.currency || 'NGN',
          source: 'PAYSTACK',
        });
      }

      // Update user subscription status
      await this.userModel.findByIdAndUpdate(
        userId,
        { subscribed: true, subscriptionExpiry: oneYearFromNow },
        { new: true },
      );

      // Send confirmation email
      try {
        await this.emailService.sendSubscriptionConfirmedEmail({
          name: user.fullName,
          email: user.email,
        });
      } catch (emailError) {
        // Log email error but don't fail the sync
        console.error('Failed to send subscription confirmation email:', emailError);
      }

      return {
        success: true,
        message: 'Subscription payment status synchronized successfully',
        data: newSubscription,
      };
    } catch (error) {
      throw error;
    }
  }
}
