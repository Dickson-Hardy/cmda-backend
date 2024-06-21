import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { FaithEntryCategory } from './faithentry.constant';

@Schema({ timestamps: true, versionKey: false })
export class FaithEntry extends Document {
  @Prop({ unique: true })
  content: string;

  @Prop()
  category: FaithEntryCategory;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;
}

export const FaithEntrySchema = SchemaFactory.createForClass(FaithEntry);
