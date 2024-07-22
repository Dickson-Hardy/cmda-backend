import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { TransitionStatus } from '../user.constant';

@Schema({ timestamps: true, versionKey: false })
export class UserTransition extends Document {
  @Prop()
  region: string;

  @Prop()
  licenseNumber: string;

  @Prop()
  specialty: string;

  @Prop({ default: TransitionStatus.PENDING })
  status: TransitionStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: string;
}

export const UserTransitionSchema = SchemaFactory.createForClass(UserTransition);
