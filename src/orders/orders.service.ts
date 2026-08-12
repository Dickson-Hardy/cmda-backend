import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { NotificationDispatcherService } from '../notifications/notification-dispatcher.service';
import { NotificationType } from '../notifications/notification.constant';
import { escapeRegex } from '../_common/escape-regex.util';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    private paystackService: PaystackService,
    private paypalService: PaypalService,
    private configService: ConfigService,
    private paymentIntentsService: PaymentIntentsService,
    private notificationDispatcher?: NotificationDispatcherService,
  ) {}

  private async priceAndValidateProducts(
    products: InitOrderDto['products'],
    currency: 'NGN' | 'USD',
  ) {
    if (!products?.length) throw new BadRequestException('At least one product is required');

    const ids = [...new Set(products.map((item) => item.product.toString()))];
    const records = await this.productModel.find({ _id: { $in: ids } });
    const byId = new Map(records.map((product) => [product._id.toString(), product]));
    const normalized = [];
    let totalAmount = 0;

    for (const item of products) {
      const product = byId.get(item.product.toString());
      if (!product) throw new NotFoundException(`Product ${item.product} does not exist`);
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException('Product quantity must be a positive whole number');
      }
      if (product.stock < item.quantity) {
        throw new ConflictException(`${product.name} does not have enough stock`);
      }
      if (item.size && product.sizes?.length && !product.sizes.includes(item.size)) {
        throw new BadRequestException(`${item.size} is not a valid size for ${product.name}`);
      }
      if (
        item.color &&
        product.additionalImages?.length &&
        !product.additionalImages.some(
          (image) => image.color === item.color || image.name === item.color,
        )
      ) {
        throw new BadRequestException(`${item.color} is not a valid color for ${product.name}`);
      }

      const unitPrice = currency === 'USD' ? product.priceUSD : product.price;
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new BadRequestException(`${product.name} has no valid ${currency} price`);
      }
      totalAmount += unitPrice * item.quantity;
      normalized.push({
        product: product._id,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        productDetails: product,
      });
    }

    return { normalized, totalAmount: Math.round(totalAmount * 100) / 100 };
  }

  private assertPaymentAmount(order: Order, amount: number, currency: string) {
    if (
      order.currency !== currency ||
      Math.round(order.totalAmount * 100) !== Math.round(amount * 100)
    ) {
      throw new BadRequestException('Payment amount or currency does not match this order');
    }
  }

  private async deductStockOnce(order: Order): Promise<void> {
    const claimed = await this.orderModel.findOneAndUpdate(
      { _id: order._id, stockDeducted: { $ne: true } },
      { $set: { stockDeducted: true } },
      { new: true },
    );
    if (!claimed) {
      const latest = await this.orderModel.findById(order._id);
      if (latest?.isPaid) return;
      throw new ConflictException('This payment is already being processed');
    }

    const deducted: Array<{ product: any; quantity: number }> = [];
    try {
      for (const item of order.products) {
        const updated = await this.productModel.findOneAndUpdate(
          { _id: item.product, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true },
        );
        if (!updated) throw new ConflictException('One or more products are no longer in stock');
        deducted.push({ product: item.product, quantity: item.quantity });
      }
    } catch (error) {
      await Promise.all(
        deducted.map((item) =>
          this.productModel.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } }),
        ),
      );
      await this.orderModel.updateOne({ _id: order._id }, { $set: { stockDeducted: false } });
      throw error;
    }
  }

  private async completePayment(
    order: Order,
    reference: string,
    amount: number,
    currency: string,
    paidAt?: string,
  ) {
    this.assertPaymentAmount(order, amount, currency);
    await this.deductStockOnce(order);
    const paidOrder = await this.orderModel.findByIdAndUpdate(
      order._id,
      {
        $set: {
          isPaid: true,
          paymentReference: reference,
          paymentDate: paidAt ? new Date(paidAt) : new Date(),
        },
      },
      { new: true },
    );
    if (paidOrder) {
      void this.notificationDispatcher?.notify({
        userId: paidOrder.user.toString(),
        type: NotificationType.PAYMENT,
        title: 'Payment confirmed',
        body: 'Your store payment was confirmed and your order is being processed.',
        idempotencyKey: `order:${paidOrder._id}:paid`,
        preference: 'payments',
        data: { orderId: paidOrder._id.toString(), paymentId: reference },
      });
    }
    return paidOrder;
  }

  async init(id: string, initOrderDto: InitOrderDto): Promise<ISuccessResponse> {
    const {
      products,
      shippingAddress,
      shippingContactEmail,
      shippingContactName,
      shippingContactPhone,
      source,
    } = initOrderDto;

    let transaction: any;
    const currency = source && source.toLowerCase() === 'paypal' ? 'USD' : 'NGN';
    const { normalized, totalAmount } = await this.priceAndValidateProducts(products, currency);
    const orderProducts = normalized.map(({ product, quantity, color, size }) => ({
      product,
      quantity,
      color,
      size,
    }));

    if (currency === 'USD') {
      const items = normalized.map((item) => ({
        name: `${item.productDetails.name} ${item.size ? ' - ' + item.size : ''} ${item.color ? ' - ' + item.color : ''}`.trim(),
        quantity: item.quantity,
        amount: item.productDetails.priceUSD,
      }));

      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const order = await this.orderModel.create({
        paymentReference: 'UNPAID-' + randomUUID(),
        isPaid: false,
        totalAmount,
        source: 'PAYPAL',
        currency: 'USD',
        products: orderProducts,
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
          products: orderProducts,
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
        products: orderProducts,
        shippingAddress,
        shippingContactEmail,
        shippingContactName,
        shippingContactPhone,
        user: id,
      });

      await this.paymentIntentsService.linkContextEntity(intent.id, order._id.toString());

      transaction = await this.paystackService.initializeTransaction({
        amount: Math.round(totalAmount * 100),
        email: shippingContactEmail,
        callback_url: this.configService.get('ORDER_SUCCESS_URL'),
        metadata: JSON.stringify({
          intentId: intent.id,
          products: orderProducts,
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
      message: 'Order payment session initiated',
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
        const pendingOrder = await this.orderModel.findById(orderId);
        if (!pendingOrder) throw new NotFoundException('Order not found');
        if (pendingOrder.user.toString() !== id) {
          throw new ForbiddenException('This payment does not belong to your order');
        }
        order = pendingOrder.isPaid
          ? pendingOrder
          : await this.completePayment(
              pendingOrder,
              reference,
              Number(amount.value),
              amount.currency_code,
              update_time,
            );
      } else {
        const transaction = await this.paystackService.verifyTransaction(reference);
        if (!transaction.status || transaction.data?.status !== 'success') {
          throw new Error(transaction.message);
        }
        const { amount } = transaction.data;
        const paidAt = transaction.data.paidAt || transaction.data.paid_at;
        let metadata = transaction.data.metadata || {};
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch {
            throw new BadRequestException('Payment metadata is invalid');
          }
        }
        const {
          products,
          shippingAddress,
          shippingContactEmail,
          shippingContactName,
          shippingContactPhone,
          orderId,
          intentId,
        } = metadata;

        // Update existing intent if it exists, otherwise create new
        if (orderId) {
          const pendingOrder = await this.orderModel.findById(orderId);
          if (!pendingOrder) throw new NotFoundException('Order not found');
          if (pendingOrder.user.toString() !== id) {
            throw new ForbiddenException('This payment does not belong to your order');
          }
          order = pendingOrder.isPaid
            ? pendingOrder
            : await this.completePayment(
                pendingOrder,
                reference,
                Number(amount) / 100,
                'NGN',
                paidAt,
              );

          if (intentId) {
            await this.paymentIntentsService.markAsSuccessful(intentId, transaction.data);
          }
        } else {
          // Backward-compatible path for legacy transactions, still repriced server-side.
          const priced = await this.priceAndValidateProducts(products, 'NGN');
          const legacyOrder = await this.orderModel.create({
            paymentReference: reference,
            isPaid: false,
            totalAmount: priced.totalAmount,
            currency: 'NGN',
            source: 'PAYSTACK',
            products: priced.normalized.map(({ product, quantity, color, size }) => ({
              product,
              quantity,
              color,
              size,
            })),
            shippingAddress,
            shippingContactEmail,
            shippingContactName,
            shippingContactPhone,
            user: id,
          });
          order = await this.completePayment(
            legacyOrder,
            reference,
            Number(amount) / 100,
            'NGN',
            paidAt,
          );
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
            { paymentReference: new RegExp(escapeRegex(searchBy), 'i') },
            { totalAmount: new RegExp(escapeRegex(searchBy), 'i') },
            { shippingContactEmail: new RegExp(escapeRegex(searchBy), 'i') },
            { shippingContactName: new RegExp(escapeRegex(searchBy), 'i') },
            { shippingContactPhone: new RegExp(escapeRegex(searchBy), 'i') },
            { shippingAddress: new RegExp(escapeRegex(searchBy), 'i') },
          ],
        }
      : {};

    const orders = await this.orderModel
      .find({ ...searchCriteria, isPaid: true })
      .sort({ createdAt: -1 })
      .limit(perPage)
      .skip(perPage * (currentPage - 1))
      .populate('user', ['_id', 'fullName', 'email']);

    const totalItems = await this.orderModel.countDocuments({ ...searchCriteria, isPaid: true });
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
              { paymentReference: new RegExp(escapeRegex(searchBy), 'i') },
              { totalAmount: new RegExp(escapeRegex(searchBy), 'i') },
              { shippingAddress: new RegExp(escapeRegex(searchBy), 'i') },
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

  async findOne(id: string, requesterId: string, isAdmin: boolean): Promise<ISuccessResponse> {
    const order = await this.orderModel
      .findOne({ _id: id, ...(isAdmin ? {} : { user: requesterId }) })
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

    void this.notificationDispatcher?.notify({
      userId: order.user.toString(),
      type: NotificationType.ORDER,
      title: `Order ${String(status).toLowerCase()}`,
      body: comment || `Your order status is now ${String(status).toLowerCase()}.`,
      idempotencyKey: `order:${order._id}:status:${status}`,
      preference: 'payments',
      data: { orderId: order._id.toString() },
    });

    return {
      success: true,
      message: 'Order updated successfully',
      data: order,
    };
  }

  async syncPaymentStatus(userId: string, reference: string): Promise<ISuccessResponse> {
    try {
      // Find pending order with this reference for this user
      let existingOrder = await this.orderModel.findOne({
        paymentReference: reference,
        user: userId,
      });

      let intent = null;
      if (!existingOrder) {
        intent = await this.paymentIntentsService.findByReference(reference);
        if (
          intent?.context === PaymentIntentContext.ORDER &&
          intent.user?.toString() === userId &&
          intent.contextEntity
        ) {
          existingOrder = await this.orderModel.findOne({
            _id: intent.contextEntity,
            user: userId,
          });
        }
      }

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

      if (!transaction.status || transaction.data?.status !== 'success') {
        return {
          success: false,
          message: 'Payment verification failed - transaction not successful',
          data: null,
        };
      }

      const updatedOrder = await this.completePayment(
        existingOrder,
        reference,
        Number(transaction.data.amount) / 100,
        'NGN',
        transaction.data.paidAt || transaction.data.paid_at,
      );
      if (intent) {
        await this.paymentIntentsService.markAsSuccessful(intent._id.toString(), transaction.data);
      }

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
