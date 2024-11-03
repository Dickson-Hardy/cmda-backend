import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order } from './order.schema';
import { PaystackService } from '../paystack/paystack.service';
import { ConfigService } from '@nestjs/config';
import { InitOrderDto } from './dto/init-order-dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { OrderStatus } from './order.constant';
import { UpdateOrderDto } from './dto/update-order.dto';

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
      products,
      shippingAddress,
      shippingContactEmail,
      shippingContactName,
      shippingContactPhone,
    } = initOrderDto;

    const transaction = await this.paystackService.initializeTransaction({
      amount: totalAmount * 100,
      email: shippingContactEmail,
      // channels: ['card'],
      callback_url: this.configService.get('ORDER_SUCCESS_URL'),
      metadata: JSON.stringify({
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
    try {
      const { reference } = createOrderDto;
      const transaction = await this.paystackService.verifyTransaction(reference);
      if (!transaction.status) {
        throw new Error(transaction.message);
      }
      const {
        amount,
        paidAt,
        metadata: {
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
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('An order with this payment reference already exist');
      }
      throw error;
    }
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

  async getStats(): Promise<ISuccessResponse> {
    const totalOrders = await this.orderModel.countDocuments();
    const totalAmountResult = await this.orderModel.aggregate([
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } },
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    const totalPending = await this.orderModel.countDocuments({ status: OrderStatus.PENDING });
    const totalShipped = await this.orderModel.countDocuments({ status: OrderStatus.SHIPPED });
    const totalDelivered = await this.orderModel.countDocuments({ status: OrderStatus.DELIVERED });
    const totalCanceled = await this.orderModel.countDocuments({ status: OrderStatus.CANCELED });

    return {
      success: true,
      message: 'Order statistics calculated successfully',
      data: { totalOrders, totalAmount, totalPending, totalShipped, totalDelivered, totalCanceled },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const order = await this.orderModel
      .findById(id)
      .populate('products.product', '_id name price featuredImageUrl');

    if (!order) {
      throw new NotFoundException('Order with such id does not exist');
    }
    return {
      success: true,
      message: 'Order fetched successfully',
      data: order,
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<ISuccessResponse> {
    const { status, comment } = updateOrderDto;

    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status, $push: { orderTimeline: { comment, status, date: new Date() } } },
      { new: true },
    );

    if (!order) {
      throw new NotFoundException('Order with id does not exist');
    }

    return {
      success: true,
      message: 'Order updated successfully',
      data: order,
    };
  }
}
