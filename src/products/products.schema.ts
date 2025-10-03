import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import slugify from 'slugify';
import { ProductCategory } from './products.constant';

@Schema({ timestamps: true, versionKey: false })
export class Product extends Document {
  @Prop({ unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ lowercase: true })
  slug: string;

  @Prop()
  price: number;

  @Prop()
  priceUSD: number;

  @Prop()
  category: ProductCategory;

  @Prop()
  stock: number;

  @Prop()
  brand: string;

  @Prop()
  featuredImageUrl: string;

  @Prop()
  featuredImageCloudId: string;

  @Prop()
  sizes: string[];

  @Prop()
  additionalImages: { name?: string; color?: string; imageUrl: string; imageCloudId: string }[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// Add pre-save hook to generate slug
ProductSchema.pre<Product>('save', async function (next) {
  if (this.isNew || this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
