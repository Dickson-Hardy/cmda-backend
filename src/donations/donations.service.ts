import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateDonationDto } from './dto/create-donation.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schema/users.schema';
import { Model } from 'mongoose';
import { PaystackService } from '../paystack/paystack.service';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ConfigService } from '@nestjs/config';
import { InitDonationDto } from './dto/init-donation.dto';
import { Donation } from './donation.schema';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { json2csv } from 'json-2-csv';
import { DonationPaginationQueryDto } from './dto/donation-pagination.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class DonationsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    private paystackService: PaystackService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async init(id: string, createDonationDto: InitDonationDto): Promise<ISuccessResponse> {
    const { amount, recurring, frequency, areasOfNeed } = createDonationDto;
    const user = await this.userModel.findById(id);
    const transaction = await this.paystackService.initializeTransaction({
      amount: amount * 100,
      email: user.email,
      // channels: ['card'], show all options
      callback_url: this.configService.get('PAYMENT_SUCCESS_URL') + '?type=donation',
      metadata: JSON.stringify({ recurring, frequency, name: user.fullName, areasOfNeed }),
    });
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    return {
      success: true,
      message: 'Donation session initiated',
      data: { checkout_url: transaction.data.authorization_url },
    };
  }

  async create(id: string, createDonationDto: CreateDonationDto): Promise<ISuccessResponse> {
    const { reference } = createDonationDto;
    const transaction = await this.paystackService.verifyTransaction(reference);
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    const {
      amount,
      metadata: { recurring, frequency, areasOfNeed },
    } = transaction.data;

    const donation = await this.donationModel.create({
      reference,
      amount: amount / 100,
      recurring: recurring && frequency ? true : false,
      ...(frequency ? { frequency } : {}),
      areasOfNeed,
      user: id,
    });

    const user = await this.userModel.findById(id);

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

    const searchCriteria: any = {};

    if (searchBy) {
      searchCriteria.$or = [
        { reference: new RegExp(searchBy, 'i') },
        { amount: new RegExp(searchBy, 'i') },
        { frequency: new RegExp(searchBy, 'i') },
        { areasOfNeed: new RegExp(searchBy, 'i') },
      ];
    }

    if (areasOfNeed) {
      searchCriteria.areasOfNeed = areasOfNeed;
    }

    const donations = await this.donationModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .populate('user', ['_id', 'fullName', 'email', 'role', 'region']);

    // Filter the populated users by role and region
    const filteredDonations = donations.filter((donation) => {
      const user = donation.user as User;
      return (!role || user.role === role) && (!region || user.region === region);
    });

    const totalItems = filteredDonations.length;
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Donation records fetched successfully',
      data: {
        items: filteredDonations,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async exportAll(userId: string): Promise<any> {
    const donations = await this.donationModel
      .find(userId ? { user: userId } : {})
      .sort({ createdAt: -1 })
      .populate('user', ['_id', 'fullName', 'email', 'role'])
      .lean();

    const donationsJson = donations.map((donation: any) => ({
      reference: donation.reference,
      amount: donation.amount,
      name: donation.user.fullName,
      email: donation.user.email,
      recurring: donation.recurring && donation.frequency,
      frequency: donation.frequency || '-',
      date: new Date(donation.createdAt).toLocaleString('en-US', { dateStyle: 'medium' }),
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
      ...(searchBy
        ? {
            $or: [
              { reference: new RegExp(searchBy, 'i') },
              { amount: new RegExp(searchBy, 'i') },
              { frequency: new RegExp(searchBy, 'i') },
              { areasOfNeed: new RegExp(searchBy, 'i') },
            ],
          }
        : {}),
    };

    const events = await this.donationModel
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
        items: events,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async getStats(): Promise<ISuccessResponse> {
    const totalDonationCount = await this.donationModel.countDocuments();

    const totalAmountResult = await this.donationModel.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);
    const totalDonationAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;

    const today = new Date().toISOString().split('T')[0];
    const startOfToday = new Date(`${today}T00:00:00+01:00`);
    const endOfToday = new Date(`${today}T23:59:59+01:00`);
    const todayDonationCount = await this.donationModel.countDocuments({
      createdAt: { $gte: startOfToday, $lte: endOfToday },
    });

    const todayAmountResult = await this.donationModel.aggregate([
      { $match: { createdAt: { $gte: startOfToday, $lte: endOfToday } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } },
    ]);
    const todayDonationAmount = todayAmountResult.length > 0 ? todayAmountResult[0].totalAmount : 0;

    return {
      success: true,
      message: 'Donation statistics calculated successfully',
      data: {
        totalDonationCount,
        totalDonationAmount,
        todayDonationCount,
        todayDonationAmount,
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
