import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { FaithEntryCategory } from './faithentry.constant';

@Schema({ timestamps: true, versionKey: false })
export class FaithEntry extends Document {
  @Prop()
  content: string;

  @Prop()
  category: FaithEntryCategory;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;

  // Kept private from populated public responses so anonymous posts remain anonymous.
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', select: false })
  owner: string;
}

export const FaithEntrySchema = SchemaFactory.createForClass(FaithEntry);
