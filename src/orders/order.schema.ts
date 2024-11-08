import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as mongoose from 'mongoose';
import { Product } from '../products/products.schema';
import { User } from '../users/schema/users.schema';
import { OrderStatus } from './order.constant';

class OrderTimelineEntry {
  @Prop({ required: true })
  comment: string;

  @Prop({ required: true, enum: OrderStatus })
  status: OrderStatus;

  @Prop({ required: true, type: Date })
  date: Date;
}

@Schema({ timestamps: true, versionKey: false })
export class Order extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop([
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      color: String,
      size: String,
    },
  ])
  products: { product: Product; quantity: number; color?: string; size?: string }[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: OrderStatus.PENDING })
  status?: OrderStatus;

  @Prop({ unique: true })
  paymentReference: string;

  @Prop({ type: Date })
  paymentDate: Date;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  source: string;

  @Prop()
  currency: string;

  @Prop({ type: Date })
  shippingDate?: Date;

  @Prop()
  shippingContactName: string;

  @Prop()
  shippingContactEmail: string;

  @Prop()
  shippingContactPhone: string;

  @Prop()
  shippingAddress: string;

  @Prop({ type: [OrderTimelineEntry], default: [] })
  orderTimeline: OrderTimelineEntry[];
}

export const OrderSchema = SchemaFactory.createForClass(Order);
