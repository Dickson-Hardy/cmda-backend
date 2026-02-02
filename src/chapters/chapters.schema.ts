import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ChapterType {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  GLOBAL = 'Global',
}

@Schema({ timestamps: true, versionKey: false })
export class Chapter extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ enum: ChapterType, required: true })
  type: ChapterType;

  @Prop()
  description?: string;

  @Prop()
  location?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  memberCount: number;
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);
ChapterSchema.index({ name: 1, type: 1 }, { unique: true });
