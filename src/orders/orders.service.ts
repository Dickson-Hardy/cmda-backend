import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './order.schema';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { InitOrderDto } from './dto/init-order-dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private paystackService: PaystackService,
    private configService: ConfigService,
  ) {}

  async init(initOrderDto: InitOrderDto): Promise<ISuccessResponse> {
    const {
      totalAmount,
      vatAmount,
      products,
      shippingAddress,
      shippingContactEmail,
      shippingContactName,
      shippingContactPhone,
    } = initOrderDto;

    const transaction = await this.paystackService.initializeTransaction({
      amount: totalAmount * 100,
      email: shippingContactEmail,
      channels: ['card'],
      callback_url: this.configService.get('ORDER_SUCCESS_URL'),
      metadata: JSON.stringify({
        vatAmount,
        products,
        shippingAddress,
        shippingContactEmail,
        shippingContactName,
        shippingContactPhone,
      }),
    });
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    return {
      success: true,
      message: 'Order payment session initiated',
      data: { checkout_url: transaction.data.authorization_url },
    };
  }

  async create(id: string, createOrderDto: CreateOrderDto): Promise<ISuccessResponse> {
    const { reference } = createOrderDto;
    const transaction = await this.paystackService.verifyTransaction(reference);
    if (!transaction.status) {
      throw new Error(transaction.message);
    }
    const {
      amount,
      paidAt,
      metadata: {
        vatAmount,
        products,
        shippingAddress,
        shippingContactEmail,
        shippingContactName,
        shippingContactPhone,
      },
    } = transaction.data;

    const order = await this.orderModel.create({
      paymentReference: reference,
      paymentDate: paidAt,
      totalAmount: amount / 100,
      vatAmount,
      products,
      shippingAddress,
      shippingContactEmail,
      shippingContactName,
      shippingContactPhone,
      user: id,
    });

    return {
      success: true,
      message: 'Order created successfully',
      data: order,
    };
  }

  async findAll(query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = searchBy
      ? {
          $or: [
            { paymentReference: new RegExp(searchBy, 'i') },
            { totalAmount: new RegExp(searchBy, 'i') },
            { vatAmount: new RegExp(searchBy, 'i') },
            { shippingContactEmail: new RegExp(searchBy, 'i') },
            { shippingContactName: new RegExp(searchBy, 'i') },
            { shippingContactPhone: new RegExp(searchBy, 'i') },
            { shippingAddress: new RegExp(searchBy, 'i') },
          ],
        }
      : {};

    const orders = await this.orderModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .populate('user', ['_id', 'fullName', 'email']);

    const totalItems = await this.orderModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'Orders fetched successfully',
      data: {
        items: orders,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }

  async getOrderHistory(id: string, query: PaginationQueryDto): Promise<ISuccessResponse> {
    const { searchBy, limit, page } = query;
    const perPage = Number(limit) || 10;
    const currentPage = Number(page) || 1;
    const searchCriteria = {
      user: id,
      ...(searchBy
        ? {
            $or: [
              { paymentReference: new RegExp(searchBy, 'i') },
              { totalAmount: new RegExp(searchBy, 'i') },
              { vatAmount: new RegExp(searchBy, 'i') },
              { shippingAddress: new RegExp(searchBy, 'i') },
            ],
          }
        : {}),
    };

    const orders = await this.orderModel
      .find(searchCriteria)
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1));
    const totalItems = await this.orderModel.countDocuments(searchCriteria);
    const totalPages = Math.ceil(totalItems / perPage);

    return {
      success: true,
      message: 'User order history fetched successfully',
      data: {
        items: orders,
        meta: { currentPage, itemsPerPage: perPage, totalItems, totalPages },
      },
    };
  }
}
