import {
  BadRequestException,
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
import { escapeRegex } from '../_common/escape-regex.util';
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotificationType } from '../notifications/notification.constant';

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
    private notificationDispatcher?: NotificationDispatcherService,
  ) {}

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  private resolveTargetYear(targetYear?: number, fallbackDate?: Date): number {
    if (typeof targetYear === 'number' && Number.isInteger(targetYear)) {
      if (targetYear < 2000 || targetYear > 2100) {
        throw new BadRequestException('targetYear must be between 2000 and 2100');
      }
      return targetYear;
    }

    return (fallbackDate || new Date()).getFullYear();
  }

  private getCalendarYearExpiryDate(year: number): Date {
    return new Date(year, 11, 31, 23, 59, 59, 999);
  }

  private resolvePaymentYear(paymentDate?: string | Date): number {
    if (!paymentDate) {
      return this.getCurrentYear();
    }

    const parsedDate = paymentDate instanceof Date ? paymentDate : new Date(paymentDate);
    if (isNaN(parsedDate.getTime())) {
      return this.getCurrentYear();
    }

    return parsedDate.getFullYear();
  }

  private buildCoverageYearCriteria(subscriptionYear?: number): Record<string, any> | null {
    if (!subscriptionYear) {
      return null;
    }

    return {
      $or: [
        { subscriptionYear },
        {
          $and: [
            { subscriptionYear: { $exists: false } },
            { isLifetime: { $ne: true } },
            { isVisionPartner: { $ne: true } },
            { createdAt: { $type: 'date' } },
            { $expr: { $eq: [{ $year: '$createdAt' }, subscriptionYear] } },
          ],
        },
      ],
    };
  }

  private normalizeCoverageYear(subscriptionYear?: number | string): number | undefined {
    const parsedYear =
      typeof subscriptionYear === 'string' ? Number(subscriptionYear) : subscriptionYear;

    if (!Number.isInteger(parsedYear)) {
      return undefined;
    }

    if (parsedYear < 2000 || parsedYear > 2100) {
      return undefined;
    }

    return parsedYear;
  }

  private resolveTargetYearFromExistingSubscription(
    existingSubscription?: Pick<Subscription, 'subscriptionYear' | 'expiryDate'>,
  ): number | undefined {
    if (!existingSubscription) {
      return undefined;
    }

    if (
      typeof existingSubscription.subscriptionYear === 'number' &&
      Number.isInteger(existingSubscription.subscriptionYear)
    ) {
      return existingSubscription.subscriptionYear;
    }

    if (
      existingSubscription.expiryDate instanceof Date &&
      !isNaN(existingSubscription.expiryDate.getTime())
    ) {
      return existingSubscription.expiryDate.getFullYear();
    }

    return undefined;
  }

  private async hasActiveCurrentYearSubscription(userId: string): Promise<boolean> {
    const currentYear = this.getCurrentYear();
    const now = new Date();

    const currentYearCoverage = await this.subscriptionModel.exists({
      user: userId,
      isLifetime: { $ne: true },
      isVisionPartner: { $ne: true },
      subscriptionYear: currentYear,
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    });

    if (currentYearCoverage) {
      return true;
    }

    const legacyCoverage = await this.subscriptionModel.exists({
      user: userId,
      isLifetime: { $ne: true },
      isVisionPartner: { $ne: true },
      subscriptionYear: { $exists: false },
      expiryDate: { $gte: now },
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    });

    return !!legacyCoverage;
  }

  async init(id: string, subscriptionData?: any): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id);
    let amount: number;
    let frequency = 'Annually';
    let isLifetime = false;
    let lifetimeType: string | undefined;
    let incomeBracket: string | undefined;
    let isNigerianLifetime = false;
    const targetYear = this.resolveTargetYear(subscriptionData?.targetYear);

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
        const validLifetimeTypes = ['gold', 'platinum', 'diamond'];
        const selectedType = validLifetimeTypes.includes(subscriptionData.lifetimeType)
          ? subscriptionData.lifetimeType
          : 'gold';
        const lifetimePlan = LIFETIME_MEMBERSHIPS[selectedType];

        if (!lifetimePlan) {
          throw new BadRequestException('Invalid lifetime membership type');
        }

        amount = lifetimePlan.price;
        isLifetime = true;
        lifetimeType = selectedType;
      } else if (subscriptionData.selectedTab === 'donations') {
        // Vision Partner (donations)
        amount = +subscriptionData.donationAmount;
        frequency = 'Monthly';
        incomeBracket = subscriptionData.incomeBracket;
      } else {
        // Regular subscription is strictly annual and calendar-year based
        const incomeBracketData = GLOBAL_INCOME_BASED_PRICING[subscriptionData.incomeBracket];
        amount = incomeBracketData.annual;
        frequency = 'Annually';
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
      const paymentSuccessUrl = this.configService.get<string>('PAYMENT_SUCCESS_URL');
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
          targetYear,
          selectedTab: subscriptionData?.selectedTab,
        }),
        items: [
          {
            name: isLifetime
              ? `CMDA Nigeria ${LIFETIME_MEMBERSHIPS[lifetimeType]?.label}`
              : subscriptionData?.selectedTab === 'donations'
                ? 'CMDA Nigeria Vision Partner'
                : `CMDA Nigeria Annual Subscription (${targetYear})`,
            quantity: 1,
            amount,
          },
        ],
        ...(paymentSuccessUrl
          ? {
              returnUrl: `${paymentSuccessUrl}?type=subscription&source=paypal`,
              cancelUrl: `${paymentSuccessUrl}?type=subscription&source=paypal&cancelled=true`,
            }
          : {}),
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
          targetYear,
        },
      });

      // Set expiry date based on lifetime or calendar-year annual subscription
      const expiryDate = isNigerianLifetime
        ? new Date(
            new Date().setFullYear(
              new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
            ),
          )
        : this.getCalendarYearExpiryDate(targetYear);

      const subscription = await this.subscriptionModel.create({
        reference: intent.intentCode,
        amount,
        expiryDate,
        user: user._id,
        currency: 'NGN',
        source: 'PAYSTACK',
        frequency: isNigerianLifetime ? 'Lifetime' : frequency,
        subscriptionYear: isNigerianLifetime ? undefined : targetYear,
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
          targetYear,
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
  async create(
    userId: string | undefined,
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<ISuccessResponse> {
    const { reference, source } = createSubscriptionDto;

    const alreadyExist = await this.subscriptionModel.findOne({ reference });
    if (alreadyExist) {
      if (!userId && alreadyExist.isPaid) {
        return {
          success: true,
          message: 'Subscription payment was already confirmed',
          data: { subscription: alreadyExist },
        };
      }
      throw new ConflictException('Subscription with this reference has already been confirmed');
    }

    let user: User;
    let subscription: Subscription;
    let expiryDate: Date;

    if (source && source?.toLowerCase() === 'paypal') {
      const transaction = await this.paypalService.captureOrGetCompletedOrder(reference);

      if (transaction?.status !== 'COMPLETED') {
        throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
      }
      const details = transaction.purchase_units[0].payments.captures[0];

      const { amount, custom_id } = details;

      let metadata: any = await Buffer.from(custom_id, 'base64').toString('utf-8');
      metadata = JSON.parse(metadata);
      const {
        memId,
        isLifetime,
        lifetimeType,
        frequency,
        incomeBracket,
        selectedTab,
        targetYear: metadataTargetYear,
      } = metadata;

      user = await this.userModel.findOne({ membershipId: memId });
      if (!user || (userId && user._id.toString() !== userId)) {
        throw new NotFoundException('Subscription reference not found for this user');
      }
      const paidAt = details?.create_time || details?.update_time;
      const paidAtDate = paidAt ? new Date(paidAt) : undefined;
      const targetYear = this.resolveTargetYear(metadataTargetYear, paidAtDate);

      // Calculate expiry date based on subscription type
      if (isLifetime) {
        const validLifetimeTypes = ['gold', 'platinum', 'diamond'];
        const selectedType = validLifetimeTypes.includes(lifetimeType) ? lifetimeType : 'gold';
        const lifetimePlan = LIFETIME_MEMBERSHIPS[selectedType];

        if (!lifetimePlan) {
          throw new BadRequestException('Invalid lifetime membership type');
        }

        expiryDate = new Date(
          new Date().setFullYear(new Date().getFullYear() + lifetimePlan.years),
        );
      } else if (selectedTab === 'donations') {
        expiryDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
      } else {
        expiryDate = this.getCalendarYearExpiryDate(targetYear);
      }

      const isVisionPartner = selectedTab === 'donations';

      subscription = await this.subscriptionModel.create({
        reference,
        amount: +amount.value,
        expiryDate,
        user: user._id,
        currency: amount.currency_code,
        source: 'PAYPAL',
        frequency: isLifetime ? 'Lifetime' : isVisionPartner ? 'Monthly' : 'Annually',
        subscriptionYear: isLifetime || isVisionPartner ? undefined : targetYear,
        incomeBracket,
        isLifetime: isLifetime || false,
        lifetimeType,
        isVisionPartner,
        isPaid: true,
      });

      // Update user fields for Global Network members
      if (user.role === UserRole.GLOBALNETWORK) {
        const hasCurrentYearCoverage = await this.hasActiveCurrentYearSubscription(
          user._id.toString(),
        );
        const updateData: any = {
          subscribed: isLifetime ? true : hasCurrentYearCoverage,
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
        const hasCurrentYearCoverage = await this.hasActiveCurrentYearSubscription(
          user._id.toString(),
        );
        user = await this.userModel.findByIdAndUpdate(
          user._id,
          { subscribed: hasCurrentYearCoverage, subscriptionExpiry: expiryDate },
          { new: true },
        );
      }
    } else {
      const transaction = await this.paystackService.verifyTransaction(reference);

      if (!transaction.status) throw new Error(transaction.message);

      const {
        amount,
        metadata: {
          memId,
          currency,
          subscriptionId,
          intentId,
          isLifetime,
          targetYear: metadataTargetYear,
        },
      } = transaction.data;

      user = await this.userModel.findOne({ membershipId: memId });
      if (!user || (userId && user._id.toString() !== userId)) {
        throw new NotFoundException('Subscription reference not found for this user');
      }

      // Set expiry date based on lifetime or calendar-year annual subscription
      const isNigerianLifetime = isLifetime === true || isLifetime === 'true';
      const paidAt = transaction?.data?.paid_at || transaction?.data?.created_at;
      const paidAtDate = paidAt ? new Date(paidAt) : undefined;
      const targetYear = this.resolveTargetYear(metadataTargetYear, paidAtDate);
      expiryDate = isNigerianLifetime
        ? new Date(
            new Date().setFullYear(
              new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
            ),
          )
        : this.getCalendarYearExpiryDate(targetYear);

      // Update existing intent if it exists, otherwise create new
      if (subscriptionId) {
        const pendingSubscription = await this.subscriptionModel.findById(subscriptionId);
        if (!pendingSubscription || (userId && pendingSubscription.user.toString() !== userId)) {
          throw new NotFoundException('Subscription record not found for this user');
        }
        subscription = await this.subscriptionModel.findByIdAndUpdate(
          subscriptionId,
          {
            reference,
            isPaid: true,
            expiryDate,
            subscriptionYear: isNigerianLifetime ? undefined : targetYear,
            frequency: isNigerianLifetime ? 'Lifetime' : 'Annually',
          },
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
          subscriptionYear: isNigerianLifetime ? undefined : targetYear,
        });
      }

      // Update user with lifetime membership info if applicable
      const hasCurrentYearCoverage = await this.hasActiveCurrentYearSubscription(
        user._id.toString(),
      );
      const updateData: any = {
        subscribed: isNigerianLifetime ? true : hasCurrentYearCoverage,
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
    try {
      if (
        (user as any).notificationPreferences?.emailNotifications === false ||
        (user as any).notificationPreferences?.payments === false
      ) {
        throw new Error('NOTIFICATION_PREFERENCE_DISABLED');
      }
      if (user.hasLifetimeMembership && subscription.frequency === 'Lifetime') {
        await this.emailService.sendLifetimeMembershipEmail({
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
        await this.emailService.sendSubscriptionConfirmedEmail({
          name: user.fullName,
          email: user.email,
        });
      }
    } catch (emailError) {
      if ((emailError as Error).message !== 'NOTIFICATION_PREFERENCE_DISABLED') {
        console.error('Failed to send subscription confirmation email:', emailError);
      }
    }
    void this.notificationDispatcher?.notify({
      userId: user._id.toString(),
      type: NotificationType.SUBSCRIPTION,
      title: 'Membership payment confirmed',
      body: 'Your CMDA membership subscription is active.',
      idempotencyKey: `subscription:${subscription._id}:active`,
      preference: 'payments',
      data: { subscriptionId: subscription._id.toString() },
    });

    return {
      success: true,
      message: 'Subscription saved successfully',
      data: { subscription, user },
    };
  }

  async activate(userId: string, subYearOrDate: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(userId);
    const amount =
      user.role === UserRole.DOCTOR && user.yearsOfExperience?.toLowerCase()?.includes('above')
        ? SUBSCRIPTION_PRICES['DoctorSenior']
        : SUBSCRIPTION_PRICES[user.role];

    const parsedYear = Number(subYearOrDate);
    const targetYear = Number.isInteger(parsedYear)
      ? this.resolveTargetYear(parsedYear)
      : this.resolveTargetYear(undefined, new Date(subYearOrDate));
    const expiryDate = this.getCalendarYearExpiryDate(targetYear);
    const subscription = await this.subscriptionModel.create({
      reference: 'ADMIN',
      amount: amount,
      expiryDate,
      subscriptionYear: targetYear,
      user: userId,
      currency: user.role === UserRole.GLOBALNETWORK ? 'USD' : 'NGN',
      frequency: 'Annually',
      source: 'ADMIN',
      isPaid: true,
    });

    const hasCurrentYearCoverage = await this.hasActiveCurrentYearSubscription(userId);

    await this.userModel.findByIdAndUpdate(
      userId,
      { subscribed: hasCurrentYearCoverage, subscriptionExpiry: expiryDate },
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
      // Validate and default to 'gold' if invalid type
      const validLifetimeTypes = ['gold', 'platinum', 'diamond'];
      const selectedType = validLifetimeTypes.includes(lifetimeType) ? lifetimeType : 'gold';
      const lifetimePlan = LIFETIME_MEMBERSHIPS[selectedType];

      if (!lifetimePlan) {
        throw new BadRequestException('Invalid lifetime membership type');
      }

      amount = lifetimePlan.price;
      expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + lifetimePlan.years));
      currency = 'USD';
      finalLifetimeType = selectedType;
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
    const { searchBy, limit, page, role, region, subscriptionYear } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    // Filter: isPaid is true OR doesn't exist (for old records before isPaid field was added)
    const searchCriteria: any = {
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    };

    if (searchBy) {
      const searchNumber = Number(searchBy);
      const searchConditions = [
        { reference: { $regex: escapeRegex(searchBy), $options: 'i' } },
        !isNaN(searchNumber) ? { amount: searchNumber } : false,
      ].filter(Boolean);

      // Combine isPaid filter with search conditions
      searchCriteria.$and = [
        { $or: [{ isPaid: true }, { isPaid: { $exists: false } }] },
        { $or: searchConditions },
      ];
      delete searchCriteria.$or;
    }

    const normalizedSubscriptionYear = this.normalizeCoverageYear(
      subscriptionYear as number | string,
    );
    const coverageYearCriteria = this.buildCoverageYearCriteria(normalizedSubscriptionYear);
    if (coverageYearCriteria) {
      if (searchCriteria.$and) {
        searchCriteria.$and.push(coverageYearCriteria);
      } else {
        searchCriteria.$and = [{ ...searchCriteria }, coverageYearCriteria];
        delete searchCriteria.$or;
      }
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
    const [totalAmountResult] = await this.subscriptionModel.aggregate([
      ...pipeline,
      {
        $group: {
          _id: null,
          totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
        },
      },
    ]);
    const totalAmount = totalAmountResult?.totalAmount || 0;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Subscription records fetched successfully',
      data: {
        items: aggregatedSubscriptions,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages, totalAmount },
      },
    };
  }

  async exportAll(query: SubscriptionPaginationQueryDto): Promise<any> {
    const { searchBy, role, region, userId, subscriptionYear } = query;

    // Filter: isPaid is true OR doesn't exist (for old records before isPaid field was added)
    const searchCriteria: any = {
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    };

    if (searchBy) {
      const searchNumber = Number(searchBy);
      const searchConditions = [
        { reference: { $regex: escapeRegex(searchBy), $options: 'i' } },
        !isNaN(searchNumber) ? { amount: searchNumber } : false,
      ].filter(Boolean);

      // Combine isPaid filter with search conditions
      searchCriteria.$and = [
        { $or: [{ isPaid: true }, { isPaid: { $exists: false } }] },
        { $or: searchConditions },
      ];
      delete searchCriteria.$or;
    }

    const normalizedSubscriptionYear = this.normalizeCoverageYear(
      subscriptionYear as number | string,
    );
    const coverageYearCriteria = this.buildCoverageYearCriteria(normalizedSubscriptionYear);
    if (coverageYearCriteria) {
      if (searchCriteria.$and) {
        searchCriteria.$and.push(coverageYearCriteria);
      } else {
        searchCriteria.$and = [{ ...searchCriteria }, coverageYearCriteria];
        delete searchCriteria.$or;
      }
    }

    if (userId) {
      if (searchCriteria.$and) {
        searchCriteria.$and.push({ user: new Types.ObjectId(userId) });
      } else {
        searchCriteria.user = new Types.ObjectId(userId);
      }
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
          SUBSCRIPTION_YEAR: {
            $ifNull: [
              '$subscriptionYear',
              {
                $cond: [{ $eq: [{ $type: '$createdAt' }, 'date'] }, { $year: '$createdAt' }, 'N/A'],
              },
            ],
          },
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
            $or: [
              { reference: new RegExp(escapeRegex(searchBy), 'i') },
              { amount: new RegExp(escapeRegex(searchBy), 'i') },
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

  async assertCanDownloadReceipt(
    subscriptionId: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<void> {
    const criteria: Record<string, unknown> = {
      _id: subscriptionId,
      $or: [{ isPaid: true }, { isPaid: { $exists: false } }],
    };

    if (!isAdmin) {
      criteria.user = requesterId;
    }

    const receiptExists = await this.subscriptionModel.exists(criteria);
    if (!receiptExists) {
      throw new NotFoundException('Receipt not available');
    }
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
  async getSubscriptionStatus(userId: string): Promise<ISuccessResponse> {
    const subscription = await this.subscriptionModel
      .findOne({ user: userId, isPaid: true })
      .sort({ createdAt: -1 });

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    const now = new Date();
    const expiryDate = subscription.expiryDate;
    const isActive = expiryDate > now && !subscription.cancelled;
    const daysUntilExpiry = expiryDate
      ? Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      success: true,
      message: 'Subscription status fetched successfully',
      data: {
        isActive,
        expiryDate,
        cancelled: subscription.cancelled || false,
        autoRenew: subscription.autoRenew || false,
        nextBillingDate: subscription.nextBillingDate || null,
        daysUntilExpiry,
      },
    };
  }

  async syncPaymentStatus(userId: string, reference: string): Promise<ISuccessResponse> {
    try {
      const requestedReference = reference;
      let providerReference = reference;
      let linkedIntent: any = null;

      if (reference.startsWith('INT-')) {
        linkedIntent = await this.paymentIntentsService.findByCode(reference);
        if (
          !linkedIntent ||
          linkedIntent.userId?.toString() !== userId ||
          linkedIntent.context !== PaymentIntentContext.SUBSCRIPTION
        ) {
          throw new NotFoundException('Subscription payment intent not found for this user');
        }
        if (!linkedIntent.providerReference) {
          return {
            success: false,
            message: 'Payment provider reference is not available yet',
            data: null,
          };
        }
        providerReference = linkedIntent.providerReference;
      }

      // Check if subscription already exists with this reference
      const existingSubscription = await this.subscriptionModel.findOne({
        reference: { $in: [requestedReference, providerReference] },
        user: userId,
      });

      if (existingSubscription?.isPaid) {
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
      const source = user.role === UserRole.GLOBALNETWORK ? 'PAYPAL' : 'PAYSTACK';

      try {
        if (source === 'PAYPAL') {
          transaction = await this.paypalService.captureOrGetCompletedOrder(providerReference);
          if (transaction?.status !== 'COMPLETED') {
            throw new Error('PayPal payment is not completed');
          }
        } else {
          transaction = await this.paystackService.verifyTransaction(providerReference);
          if (!transaction.status) {
            throw new Error('Paystack payment is not successful');
          }
        }
      } catch {
        throw new BadRequestException('Payment verification failed with the configured provider');
      }

      // Create subscription record based on payment provider
      let newSubscription: Subscription;
      let resolvedTargetYear = this.getCurrentYear();
      let resolvedExpiryDate = this.getCalendarYearExpiryDate(resolvedTargetYear);
      let syncedLifetime = false;
      let syncedLifetimeType: string | undefined;

      if (source === 'PAYPAL') {
        const details = transaction.purchase_units[0].payments.captures[0];
        const { amount } = details;
        let metadata: Record<string, any> = {};
        if (details?.custom_id) {
          try {
            const metadataRaw = Buffer.from(details.custom_id, 'base64').toString('utf-8');
            metadata = JSON.parse(metadataRaw);
          } catch {
            metadata = {};
          }
        }
        if (metadata.memId && metadata.memId !== user.membershipId) {
          throw new NotFoundException('Subscription reference not found for this user');
        }
        const paidAt = details?.create_time || details?.update_time;
        const paidAtDate = paidAt ? new Date(paidAt) : undefined;
        resolvedTargetYear = this.resolveTargetYear(metadata.targetYear, paidAtDate);
        syncedLifetime = metadata.isLifetime === true || metadata.isLifetime === 'true';
        syncedLifetimeType = syncedLifetime ? metadata.lifetimeType || 'gold' : undefined;
        const isVisionPartner = metadata.selectedTab === 'donations';

        if (syncedLifetime) {
          const lifetimePlan = LIFETIME_MEMBERSHIPS[syncedLifetimeType];
          if (!lifetimePlan) {
            throw new BadRequestException('Invalid lifetime membership type');
          }
          resolvedExpiryDate = new Date(
            new Date().setFullYear(new Date().getFullYear() + lifetimePlan.years),
          );
        } else if (isVisionPartner) {
          resolvedExpiryDate = new Date(new Date().setMonth(new Date().getMonth() + 1));
        } else {
          resolvedExpiryDate = this.getCalendarYearExpiryDate(resolvedTargetYear);
        }

        const paypalSubscriptionData = {
          reference: providerReference,
          amount: +amount.value,
          expiryDate: resolvedExpiryDate,
          subscriptionYear: syncedLifetime || isVisionPartner ? undefined : resolvedTargetYear,
          user: userId,
          currency: amount.currency_code,
          source: 'PAYPAL',
          frequency: syncedLifetime ? 'Lifetime' : isVisionPartner ? 'Monthly' : 'Annually',
          incomeBracket: metadata.incomeBracket,
          isLifetime: syncedLifetime,
          lifetimeType: syncedLifetimeType,
          isVisionPartner,
          isPaid: true,
        };

        newSubscription = existingSubscription
          ? await this.subscriptionModel.findByIdAndUpdate(
              existingSubscription._id,
              paypalSubscriptionData,
              { new: true },
            )
          : await this.subscriptionModel.create(paypalSubscriptionData);
      } else {
        const { amount, metadata = {} } = transaction.data;
        if (metadata.memId && metadata.memId !== user.membershipId) {
          throw new NotFoundException('Subscription reference not found for this user');
        }

        const paidAt = transaction?.data?.paid_at || transaction?.data?.created_at;
        const paidAtDate = paidAt ? new Date(paidAt) : undefined;
        resolvedTargetYear = this.resolveTargetYear(metadata.targetYear, paidAtDate);
        syncedLifetime = metadata.isLifetime === true || metadata.isLifetime === 'true';
        syncedLifetimeType = syncedLifetime ? 'lifetime' : undefined;
        resolvedExpiryDate = syncedLifetime
          ? new Date(
              new Date().setFullYear(
                new Date().getFullYear() + NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years,
              ),
            )
          : this.getCalendarYearExpiryDate(resolvedTargetYear);

        const targetSubscriptionId = metadata.subscriptionId || existingSubscription?._id;
        if (targetSubscriptionId) {
          const targetSubscription = await this.subscriptionModel.findById(targetSubscriptionId);
          if (!targetSubscription || targetSubscription.user.toString() !== userId) {
            throw new NotFoundException('Subscription record not found for this user');
          }

          newSubscription = await this.subscriptionModel.findByIdAndUpdate(
            targetSubscriptionId,
            {
              reference: providerReference,
              amount: amount / 100,
              expiryDate: resolvedExpiryDate,
              subscriptionYear: syncedLifetime ? undefined : resolvedTargetYear,
              currency: metadata.currency || targetSubscription.currency || 'NGN',
              source: 'PAYSTACK',
              frequency: syncedLifetime ? 'Lifetime' : 'Annually',
              isLifetime: syncedLifetime,
              isPaid: true,
            },
            { new: true },
          );
        } else {
          newSubscription = await this.subscriptionModel.create({
            reference: providerReference,
            amount: amount / 100,
            expiryDate: resolvedExpiryDate,
            subscriptionYear: syncedLifetime ? undefined : resolvedTargetYear,
            user: userId,
            currency: metadata.currency || 'NGN',
            source: 'PAYSTACK',
            frequency: syncedLifetime ? 'Lifetime' : 'Annually',
            isLifetime: syncedLifetime,
            isPaid: true,
          });
        }

        const resolvedIntentId = metadata.intentId || linkedIntent?.id;
        if (resolvedIntentId) {
          await this.paymentIntentsService.markAsSuccessful(resolvedIntentId, transaction.data);
        }
      }

      // Update user subscription status
      const hasCurrentYearCoverage = await this.hasActiveCurrentYearSubscription(userId);
      const updateData: any = {
        subscribed: syncedLifetime ? true : hasCurrentYearCoverage,
        subscriptionExpiry: resolvedExpiryDate,
      };

      if (syncedLifetime) {
        updateData.hasLifetimeMembership = true;
        updateData.lifetimeMembershipType = syncedLifetimeType;
        updateData.lifetimeMembershipExpiry = resolvedExpiryDate;
      }

      await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });

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
