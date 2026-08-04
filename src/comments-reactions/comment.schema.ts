import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['event', 'faith_entry'] })
  parentType: string;

  @Prop({ type: Types.ObjectId, required: true })
  parentId: Types.ObjectId;

  @Prop({ default: false })
  isAnonymous: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
CommentSchema.index({ parentType: 1, parentId: 1, createdAt: -1 });
