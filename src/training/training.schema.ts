import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from '../users/schema/users.schema';
import { UserRole } from '../users/user.constant';

@Schema({ timestamps: true, versionKey: false })
export class Training extends Document {
  @Prop({ unique: true, required: true, lowercase: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  membersGroup: UserRole;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  completedUsers: User[]; // users that have completed the training
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
