import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReactionDocument = HydratedDocument<Reaction>;

@Schema({ timestamps: true })
export class Reaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ required: true, enum: ['event', 'faith_entry'] })
  parentType: string;

  @Prop({ type: Types.ObjectId, required: true })
  parentId: Types.ObjectId;

  @Prop({ required: true, enum: ['like', 'pray', 'amen', 'heart', 'hallelujah'] })
  type: string;
}

export const ReactionSchema = SchemaFactory.createForClass(Reaction);
ReactionSchema.index({ parentType: 1, parentId: 1, user: 1, type: 1 }, { unique: true });
