import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshPendingPaymentDto } from './dto/refresh-pending-payment.dto';
import { Event } from '../events/events.schema';
import { Subscription } from '../subscriptions/subscription.schema';
import { Donation } from '../donations/donation.schema';
import { User } from '../users/schema/users.schema';
import { PaystackService } from '../paystack/paystack.service';
import { PaypalService } from '../paypal/paypal.service';

@Injectable()
export class PendingPaymentsService {
  private readonly logger = new Logger(PendingPaymentsService.name);

  constructor(
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(Event.name) private eventModel: Model<Event>,
    @InjectModel(User.name) private userModel: Model<User>,
    private paystackService: PaystackService,
    private paypalService: PaypalService,
  ) {}

  async getPendingRegistrations(query: {
    page: number;
    limit: number;
    searchBy?: string;
    type?: 'events' | 'subscriptions' | 'donations';
  }) {
    const { page, limit, searchBy, type } = query;
    const skip = (page - 1) * limit;

    let pendingRegistrations = [];
    let totalItems = 0;

    try {
      if (!type || type === 'events') {
        // Get pending event registrations
        const eventAggregation = [
          { $unwind: '$registeredUsers' },
          {
            $lookup: {
              from: 'users',
              localField: 'registeredUsers.userId',
              foreignField: '_id',
              as: 'userDetails',
            },
          },
          { $unwind: '$userDetails' },
          {
            $match: {
              'registeredUsers.paymentReference': { $exists: true },
            },
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: { reference: '$registeredUsers.paymentReference' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$reference', '$$reference'] }, { $eq: ['$isPaid', false] }],
                    },
                  },
                },
              ],
              as: 'payment',
            },
          },
          {
            $match: {
              $or: [{ payment: { $size: 0 } }, { 'payment.isPaid': false }],
            },
          },
        ];

        if (searchBy) {
          eventAggregation.push({
            $match: {
              $or: [
                { 'userDetails.fullName': { $regex: searchBy, $options: 'i' } },
                { 'userDetails.email': { $regex: searchBy, $options: 'i' } },
                { 'registeredUsers.paymentReference': { $regex: searchBy, $options: 'i' } },
              ],
            } as any,
          });
        }

        const eventCount = await this.eventModel.aggregate([
          ...eventAggregation,
          { $count: 'total' },
        ]);
        const events = await this.eventModel.aggregate([
          ...eventAggregation,
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              type: { $literal: 'event' },
              eventName: '$name',
              eventSlug: '$slug',
              userName: '$userDetails.fullName',
              userEmail: '$userDetails.email',
              userId: '$userDetails._id',
              reference: '$registeredUsers.paymentReference',
              registrationPeriod: '$registeredUsers.registrationPeriod',
              createdAt: '$createdAt',
            },
          },
        ]);
        pendingRegistrations = [...pendingRegistrations, ...events];
        totalItems += eventCount[0]?.total || 0;
      }

      if (!type || type === 'subscriptions') {
        // Get pending subscriptions
        const subscriptionMatch: any = { isPaid: false };
        if (searchBy) {
          const users = await this.userModel.find({
            $or: [
              { fullName: { $regex: searchBy, $options: 'i' } },
              { email: { $regex: searchBy, $options: 'i' } },
            ],
          });
          const userIds = users.map((u) => u._id);
          subscriptionMatch.$or = [
            { user: { $in: userIds } },
            { reference: { $regex: searchBy, $options: 'i' } },
          ];
        }

        const [subscriptions, subscriptionCount] = await Promise.all([
          this.subscriptionModel
            .find(subscriptionMatch)
            .skip(type ? skip : 0)
            .limit(type ? limit : limit - pendingRegistrations.length)
            .populate('user', 'fullName email')
            .lean(),
          this.subscriptionModel.countDocuments(subscriptionMatch),
        ]);

        const formattedSubscriptions = subscriptions.map((sub: any) => ({
          type: 'subscription',
          subscriptionId: sub._id,
          userName: sub.user?.fullName || 'Unknown',
          userEmail: sub.user?.email || 'Unknown',
          userId: sub.user?._id,
          reference: sub.reference,
          amount: sub.amount,
          currency: sub.currency,
          frequency: sub.frequency,
          source: sub.source,
          createdAt: sub.createdAt,
        }));

        pendingRegistrations = [...pendingRegistrations, ...formattedSubscriptions];
        totalItems += subscriptionCount;
      }

      if (!type || type === 'donations') {
        // Get pending donations
        const donationMatch: any = { isPaid: false };
        if (searchBy) {
          const users = await this.userModel.find({
            $or: [
              { fullName: { $regex: searchBy, $options: 'i' } },
              { email: { $regex: searchBy, $options: 'i' } },
            ],
          });
          const userIds = users.map((u) => u._id);
          donationMatch.$or = [
            { user: { $in: userIds } },
            { reference: { $regex: searchBy, $options: 'i' } },
          ];
        }

        const [donations, donationCount] = await Promise.all([
          this.donationModel
            .find(donationMatch)
            .skip(type ? skip : 0)
            .limit(type ? limit : limit - pendingRegistrations.length)
            .populate('user', 'fullName email')
            .lean(),
          this.donationModel.countDocuments(donationMatch),
        ]);

        const formattedDonations = donations.map((don: any) => ({
          type: 'donation',
          donationId: don._id,
          userName: don.user?.fullName || 'Unknown',
          userEmail: don.user?.email || 'Unknown',
          userId: don.user?._id,
          reference: don.reference,
          totalAmount: don.totalAmount,
          currency: don.currency,
          areasOfNeed: don.areasOfNeed,
          recurring: don.recurring,
          frequency: don.frequency,
          source: don.source,
          createdAt: don.createdAt,
        }));

        pendingRegistrations = [...pendingRegistrations, ...formattedDonations];
        totalItems += donationCount;
      }

      // Sort by creation date
      pendingRegistrations.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      // If no type specified, apply pagination to combined results
      if (!type) {
        pendingRegistrations = pendingRegistrations.slice(skip, skip + limit);
      }

      return {
        success: true,
        data: {
          items: pendingRegistrations,
          meta: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching pending registrations:', error);
      throw error;
    }
  }

  async getPendingRegistrationStats() {
    try {
      const [pendingSubscriptions, pendingDonations, pendingEvents] = await Promise.all([
        this.subscriptionModel.aggregate([
          { $match: { isPaid: false } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
            },
          },
        ]),
        this.donationModel.aggregate([
          { $match: { isPaid: false } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' },
            },
          },
        ]),
        this.eventModel.aggregate([
          { $unwind: '$registeredUsers' },
          {
            $match: {
              'registeredUsers.paymentReference': { $exists: true },
            },
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: { reference: '$registeredUsers.paymentReference' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [{ $eq: ['$reference', '$$reference'] }, { $eq: ['$isPaid', false] }],
                    },
                  },
                },
              ],
              as: 'payment',
            },
          },
          {
            $match: {
              $or: [{ payment: { $size: 0 } }, { 'payment.isPaid': false }],
            },
          },
          {
            $count: 'total',
          },
        ]),
      ]);

      const stats = {
        totalPending:
          (pendingSubscriptions[0]?.count || 0) +
          (pendingDonations[0]?.count || 0) +
          (pendingEvents[0]?.total || 0),
        pendingEvents: pendingEvents[0]?.total || 0,
        pendingSubscriptions: pendingSubscriptions[0]?.count || 0,
        pendingDonations: pendingDonations[0]?.count || 0,
        totalPendingAmount:
          (pendingSubscriptions[0]?.totalAmount || 0) + (pendingDonations[0]?.totalAmount || 0),
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Error fetching pending registration stats:', error);
      throw error;
    }
  }

  async refreshPendingPayment(refreshDto: RefreshPendingPaymentDto) {
    const { reference, bulkRefresh } = refreshDto;

    try {
      if (bulkRefresh) {
        return await this.refreshAllPendingPayments();
      }

      if (!reference) {
        throw new Error('Reference is required for individual refresh');
      }

      return await this.refreshSinglePayment(reference);
    } catch (error) {
      this.logger.error('Failed to refresh pending payment', error);
      throw error;
    }
  }

  private async refreshAllPendingPayments() {
    let refreshedCount = 0;

    try {
      // Get all pending subscriptions
      const pendingSubscriptions = await this.subscriptionModel.find({ isPaid: false }).lean();

      // Get all pending donations
      const pendingDonations = await this.donationModel.find({ isPaid: false }).lean();

      const allPending = [
        ...pendingSubscriptions.map((s: any) => ({
          reference: s.reference,
          source: s.source,
          type: 'subscription',
          id: s._id,
        })),
        ...pendingDonations.map((d: any) => ({
          reference: d.reference,
          source: d.source,
          type: 'donation',
          id: d._id,
        })),
      ];

      for (const payment of allPending) {
        try {
          const updated = await this.refreshSinglePayment(payment.reference);
          if (updated.data.updated) {
            refreshedCount++;
          }
        } catch (error) {
          this.logger.warn(`Failed to refresh payment ${payment.reference}:`, error);
        }
      }

      return {
        success: true,
        data: {
          message: `Refreshed ${refreshedCount} pending payments`,
          refreshedCount,
        },
      };
    } catch (error) {
      this.logger.error('Error in bulk refresh:', error);
      throw error;
    }
  }

  private async refreshSinglePayment(reference: string) {
    try {
      // Find the payment in subscriptions or donations
      const subscription = await this.subscriptionModel.findOne({ reference }).lean();
      const donation = await this.donationModel.findOne({ reference }).lean();

      const payment = subscription || donation;
      if (!payment) {
        return {
          success: false,
          data: {
            message: `Payment ${reference} not found`,
            updated: false,
          },
        };
      }

      const source = (payment as any).source?.toLowerCase();
      let paymentGatewayResponse;
      let isSuccessful = false;

      // Check with payment gateway
      if (source === 'paystack') {
        paymentGatewayResponse = await this.paystackService.verifyTransaction(reference);
        isSuccessful =
          paymentGatewayResponse?.status && paymentGatewayResponse.data?.status === 'success';
      } else if (source === 'paypal') {
        // PayPal uses order IDs, not references in the same way
        paymentGatewayResponse = await this.paypalService.getOrderDetails(reference);
        isSuccessful = paymentGatewayResponse?.status === 'COMPLETED';
      } else {
        return {
          success: false,
          data: {
            message: `Unknown payment source: ${source}`,
            updated: false,
          },
        };
      }

      // Update payment status if successful
      if (isSuccessful) {
        if (subscription) {
          await this.subscriptionModel.updateOne({ reference }, { isPaid: true });
        } else if (donation) {
          await this.donationModel.updateOne({ reference }, { isPaid: true });
        }

        return {
          success: true,
          data: {
            message: `Payment ${reference} status updated to successful`,
            updated: true,
          },
        };
      }

      return {
        success: true,
        data: {
          message: `Payment ${reference} is still pending`,
          updated: false,
        },
      };
    } catch (error) {
      this.logger.error(`Error refreshing payment ${reference}:`, error);
      return {
        success: false,
        data: {
          message: `Error refreshing payment ${reference}: ${error.message}`,
          updated: false,
        },
      };
    }
  }

  async getPendingEventRegistrations(query: {
    page: number;
    limit: number;
    searchBy?: string;
    eventSlug?: string;
  }) {
    const { page, limit, searchBy, eventSlug } = query;
    const skip = (page - 1) * limit;

    try {
      const aggregation: any[] = [{ $unwind: '$registeredUsers' }];

      // Filter by event slug if provided
      if (eventSlug) {
        aggregation.unshift({ $match: { slug: eventSlug } });
      }

      aggregation.push(
        {
          $lookup: {
            from: 'users',
            localField: 'registeredUsers.userId',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        { $unwind: '$userDetails' },
        {
          $match: {
            'registeredUsers.paymentReference': { $exists: true },
          },
        },
      );

      // Add search filter if provided
      if (searchBy) {
        aggregation.push({
          $match: {
            $or: [
              { 'userDetails.fullName': { $regex: searchBy, $options: 'i' } },
              { 'userDetails.email': { $regex: searchBy, $options: 'i' } },
              { 'registeredUsers.paymentReference': { $regex: searchBy, $options: 'i' } },
            ],
          },
        });
      }

      const [items, countResult] = await Promise.all([
        this.eventModel.aggregate([
          ...aggregation,
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              eventName: '$name',
              eventSlug: '$slug',
              userName: '$userDetails.fullName',
              userEmail: '$userDetails.email',
              userId: '$userDetails._id',
              reference: '$registeredUsers.paymentReference',
              registrationPeriod: '$registeredUsers.registrationPeriod',
              createdAt: '$createdAt',
            },
          },
        ]),
        this.eventModel.aggregate([...aggregation, { $count: 'total' }]),
      ]);

      const totalItems = countResult[0]?.total || 0;

      return {
        success: true,
        data: {
          items,
          meta: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching pending event registrations:', error);
      throw error;
    }
  }

  async getPendingSubscriptionPayments(query: {
    page: number;
    limit: number;
    searchBy?: string;
    role?: string;
    region?: string;
  }) {
    const { page, limit, searchBy, role, region } = query;
    const skip = (page - 1) * limit;

    try {
      const matchConditions: any = { isPaid: false };

      // Build user filters
      const userFilters: any = {};
      if (role) userFilters.role = role;
      if (region) userFilters.region = region;
      if (searchBy) {
        userFilters.$or = [
          { fullName: { $regex: searchBy, $options: 'i' } },
          { email: { $regex: searchBy, $options: 'i' } },
        ];
      }

      let userIds: any[] = [];
      if (Object.keys(userFilters).length > 0) {
        const users = await this.userModel.find(userFilters).select('_id');
        userIds = users.map((u) => u._id);
        matchConditions.user = { $in: userIds };
      }

      // Add reference search if applicable
      if (searchBy) {
        matchConditions.$or = [
          { user: { $in: userIds } },
          { reference: { $regex: searchBy, $options: 'i' } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        this.subscriptionModel
          .find(matchConditions)
          .skip(skip)
          .limit(limit)
          .populate('user', 'fullName email role region')
          .sort({ createdAt: -1 })
          .lean(),
        this.subscriptionModel.countDocuments(matchConditions),
      ]);

      const formattedItems = items.map((sub: any) => ({
        subscriptionId: sub._id,
        userName: sub.user?.fullName || 'Unknown',
        userEmail: sub.user?.email || 'Unknown',
        userId: sub.user?._id,
        userRole: sub.user?.role,
        userRegion: sub.user?.region,
        reference: sub.reference,
        amount: sub.amount,
        currency: sub.currency,
        frequency: sub.frequency,
        source: sub.source,
        isLifetime: sub.isLifetime,
        lifetimeType: sub.lifetimeType,
        createdAt: sub.createdAt,
      }));

      return {
        success: true,
        data: {
          items: formattedItems,
          meta: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching pending subscription payments:', error);
      throw error;
    }
  }

  async getPendingDonationPayments(query: {
    page: number;
    limit: number;
    searchBy?: string;
    areasOfNeed?: string;
  }) {
    const { page, limit, searchBy, areasOfNeed } = query;
    const skip = (page - 1) * limit;

    try {
      const matchConditions: any = { isPaid: false };

      // Filter by areas of need if provided
      if (areasOfNeed) {
        matchConditions['areasOfNeed.name'] = { $regex: areasOfNeed, $options: 'i' };
      }

      // Build user filters for search
      if (searchBy) {
        const users = await this.userModel.find({
          $or: [
            { fullName: { $regex: searchBy, $options: 'i' } },
            { email: { $regex: searchBy, $options: 'i' } },
          ],
        });
        const userIds = users.map((u) => u._id);
        matchConditions.$or = [
          { user: { $in: userIds } },
          { reference: { $regex: searchBy, $options: 'i' } },
        ];
      }

      const [items, totalItems] = await Promise.all([
        this.donationModel
          .find(matchConditions)
          .skip(skip)
          .limit(limit)
          .populate('user', 'fullName email')
          .sort({ createdAt: -1 })
          .lean(),
        this.donationModel.countDocuments(matchConditions),
      ]);

      const formattedItems = items.map((don: any) => ({
        donationId: don._id,
        userName: don.user?.fullName || 'Unknown',
        userEmail: don.user?.email || 'Unknown',
        userId: don.user?._id,
        reference: don.reference,
        totalAmount: don.totalAmount,
        currency: don.currency,
        areasOfNeed: don.areasOfNeed,
        recurring: don.recurring,
        frequency: don.frequency,
        source: don.source,
        createdAt: don.createdAt,
      }));

      return {
        success: true,
        data: {
          items: formattedItems,
          meta: {
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching pending donation payments:', error);
      throw error;
    }
  }

  async manuallyConfirmPayment(confirmData: {
    reference: string;
    type: 'events' | 'subscriptions' | 'donations';
    confirmationData: any;
  }) {
    const { reference, type } = confirmData;

    try {
      let updated = false;

      if (type === 'subscriptions') {
        const result = await this.subscriptionModel.updateOne({ reference }, { isPaid: true });
        updated = result.modifiedCount > 0;
      } else if (type === 'donations') {
        const result = await this.donationModel.updateOne({ reference }, { isPaid: true });
        updated = result.modifiedCount > 0;
      }
      // Note: Events store payment references in registeredUsers array,
      // but actual payment status is tracked in subscription/donation records

      if (!updated) {
        return {
          success: false,
          data: {
            message: `Payment ${reference} not found or already confirmed`,
          },
        };
      }

      this.logger.log(`Payment ${reference} manually confirmed for type: ${type}`);

      return {
        success: true,
        data: {
          message: `Payment ${reference} manually confirmed`,
        },
      };
    } catch (error) {
      this.logger.error('Error manually confirming payment:', error);
      throw error;
    }
  }

  async getPaymentVerificationDetails(reference: string, source: string) {
    try {
      let gatewayResponse;
      let formattedDetails: any = {
        reference,
        source,
        status: 'unknown',
        amount: 0,
        currency: 'NGN',
      };

      if (source.toLowerCase() === 'paystack') {
        gatewayResponse = await this.paystackService.verifyTransaction(reference);
        if (gatewayResponse?.status) {
          formattedDetails = {
            reference,
            source,
            status: gatewayResponse.data?.status || 'unknown',
            amount: gatewayResponse.data?.amount ? gatewayResponse.data.amount / 100 : 0,
            currency: gatewayResponse.data?.currency || 'NGN',
            paidAt: gatewayResponse.data?.paid_at,
            customer: {
              email: gatewayResponse.data?.customer?.email,
              customerCode: gatewayResponse.data?.customer?.customer_code,
            },
            channel: gatewayResponse.data?.channel,
            gatewayResponse: gatewayResponse.data,
          };
        }
      } else if (source.toLowerCase() === 'paypal') {
        gatewayResponse = await this.paypalService.getOrderDetails(reference);
        if (gatewayResponse) {
          const purchaseUnit = gatewayResponse.purchase_units?.[0];
          formattedDetails = {
            reference,
            source,
            status: gatewayResponse.status || 'unknown',
            amount: parseFloat(purchaseUnit?.amount?.value || '0'),
            currency: purchaseUnit?.amount?.currency_code || 'USD',
            paidAt: gatewayResponse.update_time,
            customer: {
              email: gatewayResponse.payer?.email_address,
              name:
                gatewayResponse.payer?.name?.given_name +
                ' ' +
                gatewayResponse.payer?.name?.surname,
            },
            gatewayResponse,
          };
        }
      }

      return {
        success: true,
        data: formattedDetails,
      };
    } catch (error) {
      this.logger.error(`Error verifying payment ${reference}:`, error);
      return {
        success: false,
        data: {
          reference,
          source,
          error: error.message,
        },
      };
    }
  }
}
