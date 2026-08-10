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

  @Prop({ default: true })
  pushNotifications: boolean;

  @Prop({ default: true })
  emailNotifications: boolean;

  @Prop({ default: true })
  events: boolean;

  @Prop({ default: true })
  payments: boolean;

  @Prop({ default: true })
  reminders: boolean;

  @Prop({ default: false })
  marketing: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  user: string;
}

export const UserSettingsSchema = SchemaFactory.createForClass(UserSettings);
