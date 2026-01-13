import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum DeliverableStatus {
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

export enum DeliverableCategory {
  FEATURE = 'feature',
  BUG_FIX = 'bug_fix',
  ENHANCEMENT = 'enhancement',
  SECURITY = 'security',
  INFRASTRUCTURE = 'infrastructure',
  DOCUMENTATION = 'documentation',
}

export enum RepositoryType {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  ADMIN = 'admin',
  MOBILE = 'mobile',
}

@Schema({ timestamps: true })
export class ProjectDeliverable extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String, enum: DeliverableCategory, required: true })
  category: DeliverableCategory;

  @Prop({ type: String, enum: DeliverableStatus, required: true })
  status: DeliverableStatus;

  @Prop({ type: [String], enum: RepositoryType })
  repositories: RepositoryType[];

  @Prop({ type: Number }) // Hours
  estimatedTime: number;

  @Prop({ type: Number }) // Hours
  actualTime: number;

  @Prop({ type: Number }) // Lines of code
  linesOfCode: number;

  @Prop({ type: Number }) // Number of commits
  commits: number;

  @Prop({ type: Date })
  startDate: Date;

  @Prop({ type: Date })
  completionDate: Date;

  @Prop({ type: [String] })
  tags: string[];

  @Prop({ type: String })
  businessValue: string;

  @Prop({ type: String })
  technicalNotes: string;

  @Prop({ type: Number, default: 0 }) // Priority (0-5)
  priority: number;

  @Prop({ type: String })
  clientFacing: string; // Client-friendly description

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const ProjectDeliverableSchema = SchemaFactory.createForClass(ProjectDeliverable);
