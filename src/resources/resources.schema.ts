import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ResourceCategory } from './resources.constant';

@Schema({ timestamps: true, versionKey: false })
export class Resource extends Document {
  @Prop({ unique: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ unique: true })
  slug: string;

  @Prop()
  featuredImage: string;

  @Prop()
  sourceUrl: string;

  @Prop()
  category: ResourceCategory;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop(raw({ name: String, avatarUrl: String }))
  author: Record<string, string>;

  @Prop()
  publishedAt: Date;

  @Prop({ default: '' })
  fileUrl: string;

  @Prop({ default: '' })
  fileType: string;

  @Prop({ default: 0 })
  fileSize: number;

  @Prop({ default: 0 })
  downloadCount: number;
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);
