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
  NIGERIAN_LIFETIME_MEMBERSHIP,
} from './subscription.constant';
import { json2csv } from 'json-2-csv';
import { SubscriptionPaginationQueryDto } from './dto/subscription-pagination.dto';
import { EmailService } from '../email/email.service';
import { UserRole } from '../users/user.constant';
import { PaypalService } from '../paypal/paypal.service';
import { PipelineStage } from 'mongoose';
import { PaymentIntentsService } from '../payment-intents/payment-intents.service';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
} from '../payment-intents/payment-intent.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    private paystackService: PaystackService,
    private paypalService: PaypalService,
    private configService: ConfigService,
    private emailService: EmailService,
    private paymentIntentsService: PaymentIntentsService,
  ) {}

  async init(id: string, subscriptionData?: any): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id);
    let amount: number;
    let frequency = 'Annually';
    let isLifetime = false;
    let lifetimeType: string | undefined;
    let incomeBracket: string | undefined;
    let isNigerianLifetime = false;

    // Handle Nigerian lifetime membership
    if (subscriptionData?.isNigerianLifetime && user.role !== UserRole.GLOBALNETWORK) {
      amount = NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.price;
      isLifetime = true;
      isNigerianLifetime = true;
      lifetimeType = 'lifetime';
    }
    // Handle Global Network members with income-based pricing or lifetime memberships
    else if (user.role === UserRole.GLOBALNETWORK && subscriptionData) {
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
      // STUDENT AND DOCTORS - Create payment intent
      const intent = await this.paymentIntentsService.createIntent({
        email: user.email,
        userId: user._id.toString(),
        amount,
        currency: 'NGN',
        provider: PaymentIntentProvider.PAYSTACK,
        context: PaymentIntentContext.SUBSCRIPTION,
        contextData: {
          memId: user.membershipId,
          frequency,
          isLifetime,
          isNigerianLifetime,
        },
      });

      // Set expiry date based on lifetime or annual subscription
      const expiryDate = isNigerianLifetime
        ? new Date(
            new Date().setFullYear(
              new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
            ),
          )
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

      const subscription = await this.subscriptionModel.create({
        reference: intent.intentCode,
        amount,
        expiryDate,
        user: user._id,
        currency: 'NGN',
        source: 'PAYSTACK',
        frequency: isNigerianLifetime ? 'Lifetime' : frequency,
        isPaid: false,
      });

      await this.paymentIntentsService.linkContextEntity(intent.id, subscription._id.toString());

      transaction = await this.paystackService.initializeTransaction({
        amount: amount * 100,
        email: user.email,
        callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=subscription',
        metadata: JSON.stringify({
          desc: 'SUBSCRIPTION',
          intentId: intent.id,
          name: user.fullName,
          memId: user.membershipId,
          currency: 'NGN',
          subscriptionId: subscription._id.toString(),
          isLifetime: isNigerianLifetime,
        }),
      });
      if (!transaction.status) {
        throw new Error(transaction.message);
      }

      await this.paymentIntentsService.attachCheckoutData(
        intent.id,
        transaction.data.authorization_url,
      );
      await this.paymentIntentsService.updateProviderReference(
        intent.id,
        transaction.data.reference,
      );
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
        isPaid: true,
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
        metadata: { memId, currency, subscriptionId, intentId, isLifetime },
      } = transaction.data;

      user = await this.userModel.findOne({ membershipId: memId });

      // Set expiry date based on lifetime or annual subscription
      const isNigerianLifetime = isLifetime === true || isLifetime === 'true';
      expiryDate = isNigerianLifetime
        ? new Date(
            new Date().setFullYear(
              new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
            ),
          )
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

      // Update existing intent if it exists, otherwise create new
      if (subscriptionId) {
        subscription = await this.subscriptionModel.findByIdAndUpdate(
          subscriptionId,
          { reference, isPaid: true },
          { new: true },
        );

        if (intentId) {
          await this.paymentIntentsService.markAsSuccessful(intentId, transaction.data);
        }
      } else {
        // Fallback for old payments without intent
        subscription = await this.subscriptionModel.create({
          reference,
          amount: amount / 100,
          expiryDate,
          user: user._id,
          currency,
          source: 'PAYSTACK',
          isPaid: true,
          frequency: isNigerianLifetime ? 'Lifetime' : 'Annually',
        });
      }

      // Update user with lifetime membership info if applicable
      const updateData: any = {
        subscribed: true,
        subscriptionExpiry: expiryDate,
      };

      if (isNigerianLifetime) {
        updateData.hasLifetimeMembership = true;
        updateData.lifetimeMembershipType = 'lifetime';
        updateData.lifetimeMembershipExpiry = expiryDate;
      }

      user = await this.userModel.findByIdAndUpdate(user._id, updateData, { new: true });
    }

    // Send appropriate email based on subscription type
    let res: { success: boolean };
    if (user.hasLifetimeMembership && subscription.frequency === 'Lifetime') {
      res = await this.emailService.sendLifetimeMembershipEmail({
        name: user.fullName,
        email: user.email,
        membershipType:
          user.lifetimeMembershipType === 'lifetime'
            ? 'Nigerian Lifetime Membership'
            : `Lifetime ${user.lifetimeMembershipType.charAt(0).toUpperCase() + user.lifetimeMembershipType.slice(1)}`,
        years:
          user.lifetimeMembershipType === 'lifetime'
            ? NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years
            : LIFETIME_MEMBERSHIPS[user.lifetimeMembershipType]?.years || 25,
        expiryDate: user.lifetimeMembershipExpiry.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });
    } else {
      res = await this.emailService.sendSubscriptionConfirmedEmail({
        name: user.fullName,
        email: user.email,
      });
    }

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

  async activateLifetime(
    userId: string,
    isNigerian?: boolean,
    lifetimeType?: string,
  ): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let amount: number;
    let expiryDate: Date;
    let currency: string;
    let finalLifetimeType: string;

    if (isNigerian || user.role !== UserRole.GLOBALNETWORK) {
      // Nigerian lifetime membership
      amount = NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.price;
      expiryDate = new Date(
        new Date().setFullYear(
          new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
        ),
      );
      currency = 'NGN';
      finalLifetimeType = 'lifetime';
    } else {
      // Global Network lifetime membership
      const lifetimePlan = LIFETIME_MEMBERSHIPS[lifetimeType || 'gold'];
      amount = lifetimePlan.price;
      expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + lifetimePlan.years));
      currency = 'USD';
      finalLifetimeType = lifetimeType || 'gold';
    }

    // Create subscription record
    const subscription = await this.subscriptionModel.create({
      reference: 'ADMIN_LIFETIME',
      amount,
      expiryDate,
      user: userId,
      currency,
      frequency: 'Lifetime',
      source: 'ADMIN',
      isPaid: true,
      isLifetime: true,
      lifetimeType: finalLifetimeType,
    });

    // Update user with lifetime membership info
    await this.userModel.findByIdAndUpdate(
      userId,
      {
        subscribed: true,
        subscriptionExpiry: expiryDate,
        hasLifetimeMembership: true,
        lifetimeMembershipType: finalLifetimeType,
        lifetimeMembershipExpiry: expiryDate,
      },
      { new: true },
    );

    // Send email notification
    const res = await this.emailService.sendLifetimeMembershipEmail({
      name: user.fullName,
      email: user.email,
      membershipType: isNigerian
        ? 'Nigerian Lifetime Membership'
        : `Lifetime ${finalLifetimeType.charAt(0).toUpperCase() + finalLifetimeType.slice(1)}`,
      years: isNigerian
        ? NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years
        : LIFETIME_MEMBERSHIPS[finalLifetimeType].years,
      expiryDate: expiryDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });

    if (!res.success) {
      throw new InternalServerErrorException(
        'Lifetime membership activated. Error occurred while sending email',
      );
    }

    return {
      success: true,
      message: 'Lifetime membership activated successfully',
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
      // Include both paid and unpaid (intents) subscriptions
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
