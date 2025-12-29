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
import { PaypalService } from '../paypal/paypal.service';
import { Product } from '../products/products.schema';
import ShortUniqueId from 'short-unique-id';
import { PaymentIntentsService } from '../payment-intents/payment-intents.service';
import {
  PaymentIntentContext,
  PaymentIntentProvider,
} from '../payment-intents/payment-intent.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private paystackService: PaystackService,
    private paypalService: PaypalService,
    private configService: ConfigService,
    private paymentIntentsService: PaymentIntentsService,
  ) {}

  async init(id: string, initOrderDto: InitOrderDto): Promise<ISuccessResponse> {
    const {
      totalAmount,
      products,
      shippingAddress,
      shippingContactEmail,
      shippingContactName,
      shippingContactPhone,
      source,
    } = initOrderDto;

    let transaction: any;

    if (source && source.toLowerCase() === 'paypal') {
      const productsData = [];
      for (const prod of products) {
        const productDetails = await this.productModel.findById(prod.product);
        productsData.push({ ...prod, product: productDetails });
      }
      const items = productsData.map((item) => ({
        name: `${item.product.name} ${item.size ? ' - ' + item.size : ''} ${item.color ? ' - ' + item.color : ''}`.trim(),
        quantity: item.quantity,
        amount: item.product.priceUSD,
      }));

      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const order = await this.orderModel.create({
        paymentReference: 'UNPAID-' + randomUUID(),
        isPaid: false,
        totalAmount,
        source: 'PAYPAL',
        currency: 'USD',
        products,
        shippingAddress,
        shippingContactEmail,
        shippingContactName,
        shippingContactPhone,
        user: id,
      });

      transaction = await this.paypalService.createOrder({
        amount: totalAmount,
        currency: 'USD',
        description: 'ORDER',
        metadata: JSON.stringify({ orderId: order._id }),
        items,
      });
    } else {
      // STUDENT AND DOCTORS - Create payment intent
      const intent = await this.paymentIntentsService.createIntent({
        email: shippingContactEmail,
        userId: id,
        amount: totalAmount,
        currency: 'NGN',
        provider: PaymentIntentProvider.PAYSTACK,
        context: PaymentIntentContext.ORDER,
        contextData: {
          products,
          shippingAddress,
          shippingContactName,
          shippingContactPhone,
        },
      });

      const order = await this.orderModel.create({
        paymentReference: intent.intentCode,
        isPaid: false,
        totalAmount,
        source: 'PAYSTACK',
        currency: 'NGN',
        products,
        shippingAddress,
        shippingContactEmail,
        shippingContactName,
        shippingContactPhone,
        user: id,
      });

      await this.paymentIntentsService.linkContextEntity(intent.id, order._id.toString());

      transaction = await this.paystackService.initializeTransaction({
        amount: totalAmount * 100,
        email: shippingContactEmail,
        callback_url: this.configService.get('ORDER_SUCCESS_URL'),
        metadata: JSON.stringify({
          intentId: intent.id,
          products,
          shippingAddress,
          shippingContactEmail,
          shippingContactName,
          shippingContactPhone,
          orderId: order._id.toString(),
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

      transaction = { checkout_url: transaction.data.authorization_url };
    }

    return {
      success: true,
      message: 'Subscription session initiated',
      data: transaction,
    };
  }

  async create(id: string, createOrderDto: CreateOrderDto): Promise<ISuccessResponse> {
    try {
      const { reference, source } = createOrderDto;
      let order: Order | any;

      if (source && source.toLowerCase() === 'paypal') {
        const transaction = await this.paypalService.captureOrder(reference);

        if (transaction?.status !== 'COMPLETED') {
          throw new Error(transaction.message || 'Payment with Paypal was NOT successful');
        }

        const details = transaction.purchase_units[0].payments.captures[0];

        const { amount, custom_id, update_time } = details; // { currency_code, value },

        let metadata: any = Buffer.from(custom_id, 'base64').toString('utf-8');
        metadata = JSON.parse(metadata);
        const { orderId } = metadata;

        order = await this.orderModel.findByIdAndUpdate(
          orderId,
          {
            isPaid: true,
            paymentReference: reference,
            paidAt: update_time || new Date().toISOString(),
            totalAmount: amount.value,
            currency: amount.currency_code,
          },
          { new: true },
        );
      } else {
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
            orderId,
            intentId,
          },
        } = transaction.data;

        // Update existing intent if it exists, otherwise create new
        if (orderId) {
          order = await this.orderModel.findByIdAndUpdate(
            orderId,
            {
              isPaid: true,
              paymentReference: reference,
              paymentDate: paidAt || new Date().toISOString(),
            },
            { new: true },
          );

          if (intentId) {
            await this.paymentIntentsService.markAsSuccessful(intentId, transaction.data);
          }
        } else {
          // Fallback for old payments without intent
          order = await this.orderModel.create({
            paymentReference: reference,
            paymentDate: paidAt,
            isPaid: true,
            totalAmount: amount / 100,
            products,
            shippingAddress,
            shippingContactEmail,
            shippingContactName,
            shippingContactPhone,
            user: id,
          });
        }
      }

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
      .find({ ...searchCriteria, isPaid: true })
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
      // Include both paid and unpaid (intents) orders
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
    const totalOrders = await this.orderModel.countDocuments({ isPaid: true });
    const totalAmountResult = await this.orderModel.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, totalAmount: { $sum: '$totalAmount' } } },
    ]);
    const totalAmount = totalAmountResult.length > 0 ? totalAmountResult[0].totalAmount : 0;
    const totalPending = await this.orderModel.countDocuments({
      status: OrderStatus.PENDING,
      isPaid: true,
    });
    const totalShipped = await this.orderModel.countDocuments({
      status: OrderStatus.SHIPPED,
      isPaid: true,
    });
    const totalDelivered = await this.orderModel.countDocuments({
      status: OrderStatus.DELIVERED,
      isPaid: true,
    });
    const totalCanceled = await this.orderModel.countDocuments({
      status: OrderStatus.CANCELED,
      isPaid: true,
    });

    return {
      success: true,
      message: 'Order statistics calculated successfully',
      data: { totalOrders, totalAmount, totalPending, totalShipped, totalDelivered, totalCanceled },
    };
  }

  async findOne(id: string): Promise<ISuccessResponse> {
    const order = await this.orderModel
      .findById(id)
      .populate('products.product', '_id name price priceUSD featuredImageUrl');

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

  async syncPaymentStatus(userId: string, reference: string): Promise<ISuccessResponse> {
    try {
      // Find pending order with this reference for this user
      const existingOrder = await this.orderModel.findOne({
        paymentReference: reference,
        user: userId,
      });

      if (!existingOrder) {
        throw new NotFoundException('Order with this payment reference not found');
      }

      if (existingOrder.isPaid) {
        return {
          success: true,
          message: 'Order payment is already confirmed',
          data: existingOrder,
        };
      }

      // Verify with payment provider
      const transaction = await this.paystackService.verifyTransaction(reference);

      if (!transaction.status) {
        return {
          success: false,
          message: 'Payment verification failed - transaction not successful',
          data: null,
        };
      }

      // Update order status
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        existingOrder._id,
        {
          isPaid: true,
          paymentDate: transaction.data.paidAt ? new Date(transaction.data.paidAt) : new Date(),
          totalAmount: transaction.data.amount / 100,
        },
        { new: true },
      );

      return {
        success: true,
        message: 'Order payment status synchronized successfully',
        data: updatedOrder,
      };
    } catch (error) {
      throw error;
    }
  }
}
