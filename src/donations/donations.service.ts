import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schema/users.schema';
import { Model, PipelineStage } from 'mongoose';
import { PaystackService } from '../paystack/paystack.service';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ConfigService } from '@nestjs/config';
import { InitDonationDto } from './dto/init-donation.dto';
import { Donation } from './donation.schema';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { json2csv } from 'json-2-csv';
import { DonationPaginationQueryDto } from './dto/donation-pagination.dto';
import { EmailService } from '../email/email.service';
import { PaypalService } from '../paypal/paypal.service';
import { UserRole } from '../users/user.constant';
import ShortUniqueId from 'short-unique-id';

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private emailService: EmailService,
    private paypalService: PaypalService,
  ) {}

  async init(id: string, createDonationDto: InitDonationDto): Promise<ISuccessResponse> {
    const { totalAmount, recurring, frequency, areasOfNeed, currency } = createDonationDto;
    const user = await this.userModel.findById(id);
    let transaction: any;
    // GLOBAL NETWORK DOCTORS
    if (user.role === UserRole.GLOBALNETWORK) {
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const donation = await this.donationModel.create({
        reference: 'UNPAID-' + randomUUID(),
        isPaid: false,
        totalAmount,
        currency,
        recurring: recurring && frequency ? true : false,
        ...(frequency ? { frequency } : {}),
        areasOfNeed,
        user: user._id,
        source: 'PAYPAL',
      });

      transaction = await this.paypalService.createOrder({
        amount: totalAmount,
        currency,
        description: 'DONATION',
        metadata: JSON.stringify({ donationId: donation._id, memId: user.membershipId }),
        items: areasOfNeed.map(({ name, amount }) => ({
          name: 'DONATION for ' + name,
          amount,
          quantity: 1,
        })),
      });
    } else {
      // STUDENT AND DOCTORS
      transaction = await this.paystackService.initializeTransaction({
        amount: totalAmount * 100,
        email: user.email,
        // channels: ['card'], show all options
        callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=donation',
        metadata: JSON.stringify({
          recurring,
          frequency,
          currency,
          memId: user.membershipId,
          areasOfNeed,
        }),
      });
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
    }

    return {
      success: true,
      message: 'Donation session initiated',
      data:
        user.role === UserRole.GLOBALNETWORK
          ? transaction
          : { checkout_url: transaction.data.authorization_url },
    };
  }

  async create(createDonationDto: CreateDonationDto): Promise<ISuccessResponse> {
    const { reference, source } = createDonationDto;
    let donation: Donation;
    let user: User;

    const alreadyExist = await this.donationModel.findOne({ reference });
    if (alreadyExist) {
      throw new ConflictException('Donation with this reference has already been confirmed');
    }

    if (source && source?.toLowerCase() === 'paypal') {
      const transaction = await this.paypalService.captureOrder(reference);

      if (transaction?.status !== 'COMPLETED') {
        throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
      }

      const details = transaction.purchase_units[0].payments.captures[0];
      let metadata: any = await Buffer.from(details.custom_id, 'base64').toString('utf-8');
      metadata = JSON.parse(metadata);
      const { donationId, memId } = metadata;

      user = await this.userModel.findOne({ membershipId: memId });

      donation = await this.donationModel.findByIdAndUpdate(
        donationId,
        { reference, isPaid: true },
        { new: true },
      );
    } else {
      const transaction = await this.paystackService.verifyTransaction(reference);

      if (!transaction.status) {
        throw new Error(transaction.message);
      }
      const {
        amount,
        metadata: { recurring, frequency, currency, areasOfNeed, memId },
      } = transaction.data;

      user = await this.userModel.findOne({ membershipId: memId });

      donation = await this.donationModel.create({
        reference,
        totalAmount: amount / 100,
        currency,
        isPaid: true,
        recurring: recurring && frequency ? true : false,
        ...(frequency ? { frequency } : {}),
        areasOfNeed,
        user: user._id,
        source: 'PAYSTACK',
      });
    }

    const res = await this.emailService.sendDonationConfirmedEmail({
      name: user.fullName,
      email: user.email,
    });

    if (!res.success) {
      throw new InternalServerErrorException(
        'Donation confirmed. Error occured while sending email',
      );
    }

    return {
      success: true,
      message: 'Donation saved successfully',
      data: donation,
    };
  }

  async findAll(query: DonationPaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page, role, region, areasOfNeed } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;

    const searchCriteria: any = { isPaid: true };

    if (searchBy) {
      searchCriteria.$or = [
        { reference: { $regex: searchBy, $options: 'i' } },
        { amount: { $regex: searchBy, $options: 'i' } },
        { frequency: { $regex: searchBy, $options: 'i' } },
      ];
    }

    if (areasOfNeed) {
      searchCriteria.areasOfNeed = { $elemMatch: { name: areasOfNeed } };
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

    const aggregatedDonors = await this.donationModel.aggregate(
      pipeline.concat(paginationCriteria),
    );

    let totalItems: any = await this.donationModel.aggregate(pipeline);
    totalItems = totalItems.length;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Donation records fetched successfully',
      data: {
        items: aggregatedDonors,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async exportAll(userId: string): Promise<any> {
    const donations = await this.donationModel
      .find(userId ? { user: userId, isPaid: true } : { isPaid: true })
      .sort({ createdAt: -1 })
      .populate('user', ['_id', 'fullName', 'email', 'role'])
      .lean();

    const donationsJson = donations.map((donation: any) => ({
      DATE: new Date(donation.createdAt).toLocaleString('en-US', { dateStyle: 'medium' }),
      SOURCE: donation.source || 'N/A',
      REFERENCE: donation.reference,
      CURRENCY: donation.currency,
      TOTAL_AMOUNT: donation.totalAmount,
      NAME: donation.user?.fullName || 'N/A',
      EMAIL: donation.user?.email || 'N/A',
      FREQUENCY: donation.frequency || 'One-time',
      AREAS_OF_NEED: donation.areasOfNeed
        .map((x) => x.name + ' - ' + x.amount + donation.currency)
        .join(', '),
    }));

    const csv = await json2csv(donationsJson);

    return csv;
  }

  async findUserDonations(id: string, query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = {
      user: id,
      isPaid: true,
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

    const donations = await this.donationModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.donationModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'User donations fetched successfully',
      data: {
        items: donations,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async getStats(): Promise<ISuccessResponse> {
    const totalDonationCount = await this.donationModel.countDocuments({ isPaid: true });

    const totalDonationAmount = {};
    const currencies = await this.donationModel.distinct('currency');

    for (const currency of currencies) {
      const aggregatedTotal = await this.donationModel.aggregate([
        { $match: { currency, isPaid: true } },
        { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } },
      ]);
      totalDonationAmount[currency] =
        aggregatedTotal.length > 0 ? aggregatedTotal[0].totalAmount : 0;
    }
    // removec currencies with value 0
    Object.entries(totalDonationAmount).forEach(([key, val]) => {
      if (!val) delete totalDonationAmount[key];
    });

    const today = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${today}T00:00:00+01:00`);
    const endOfToday = new Date(`${today}T23:59:59+01:00`);
    const todayDonationCount = await this.donationModel.countDocuments({
      isPaid: true,
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    return {
      success: true,
      message: 'Donation statistics calculated successfully',
      data: {
        totalDonationCount,
        totalDonationAmount,
        todayDonationCount,
      },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const donation = await this.donationModel.findById(id).populate('user', '_id fullName email');

    if (!donation) {
      throw new NotFoundException('Donation with such id does not exist');
    }
    return {
      success: true,
      message: 'Donation fetched successfully',
      data: donation,
    };
  }
}
