import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class UserSettings extends Document {
  @Prop({ default: false })
  newMessage: boolean;

  @Prop({ default: false })
  replies: boolean;

  @Prop({ default: true })
  announcements: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: string;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
