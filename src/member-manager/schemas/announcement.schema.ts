import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum AnnouncementType {
  POPUP = 'popup',
  BANNER = 'banner',
  NOTIFICATION = 'notification',
}

export enum AnnouncementPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Schema({ timestamps: true })
export class Announcement extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: Object.values(AnnouncementType) })
  type: AnnouncementType;

  @Prop({ enum: Object.values(AnnouncementPriority), default: AnnouncementPriority.MEDIUM })
  priority: AnnouncementPriority;

  @Prop({ type: [String], default: [] })
  targetRoles: string[]; // Empty means all users

  @Prop({ type: [String], default: [] })
  targetRegions: string[]; // Empty means all regions

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  imageUrl?: string;

  @Prop()
  actionButtonText?: string;

  @Prop()
  actionButtonUrl?: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  viewedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  dismissedBy: Types.ObjectId[];
}

export const AnnouncementSchema = SchemaFactory.createForClass(Announcement);
