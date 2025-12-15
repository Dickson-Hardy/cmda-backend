import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmailTemplateDocument = EmailTemplate & Document;

@Schema({ timestamps: true })
export class EmailTemplate {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  subject: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    type: String,
    enum: ['welcome', 'renewal', 'follow-up', 'event', 'general', 'announcement', 'newsletter'],
    required: true,
  })
  category: string;

  @Prop({ type: [String], default: [] })
  variables: string[]; // e.g., ['{{firstName}}', '{{membershipType}}']

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastModifiedBy: Types.ObjectId;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  usageCount: number;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
