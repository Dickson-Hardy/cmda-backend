import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ContentType {
  CHAT = 'chat',
  DEVOTIONAL = 'devotional',
  RESOURCE = 'resource',
  COMMENT = 'comment',
  POST = 'post',
}

export enum ModerationAction {
  HIDE = 'hide',
  REMOVE = 'remove',
  APPROVE = 'approve',
  FLAG = 'flag',
}

@Schema({ timestamps: true })
export class ModerationLog extends Document {
  @Prop({ type: Types.ObjectId, refPath: 'contentModel', required: true })
  contentId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(ContentType) })
  contentType: ContentType;

  @Prop({ required: true })
  contentModel: string; // 'Chat', 'Devotional', 'Resource', etc.

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  contentOwnerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  moderatedBy: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(ModerationAction) })
  action: ModerationAction;

  @Prop({ required: true })
  reason: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  notifiedUser: boolean;

  @Prop()
  contentSnapshot?: string; // Store content for reference
}

export const ModerationLogSchema = SchemaFactory.createForClass(ModerationLog);
