import { forwardRef, Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PaystackModule } from '../paystack/paystack.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './order.schema';
import { Product, ProductSchema } from '../products/products.schema';
import { PaypalModule } from '../paypal/paypal.module';
import { PaymentIntentsModule } from '../payment-intents/payment-intents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    forwardRef(() => PaystackModule),
    PaypalModule,
    forwardRef(() => PaymentIntentsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
