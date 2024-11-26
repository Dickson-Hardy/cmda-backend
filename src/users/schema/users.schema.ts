import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Counter } from '../../_global/schema/counter.schema';
import { UserGender, UserRole } from '../user.constant';
import mongoose from 'mongoose';
import { Event } from '../../events/events.schema';
import { Vacancy } from '../../vacancy/vacancy.schema';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.verificationCode;
    },
  },
})
export class User extends Document {
  @Prop()
  avatarUrl: string;

  @Prop()
  avatarCloudId: string;

  @Prop()
  firstName: string;

  @Prop()
  middleName?: string;

  @Prop()
  lastName: string;

  @Prop()
  fullName: string;

  @Prop({ unique: true, lowercase: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  phone?: string;

  @Prop()
  bio?: string;

  @Prop()
  gender: UserGender;

  @Prop()
  dateOfBirth: Date;

  @Prop()
  role: UserRole;

  @Prop()
  membershipId: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  region: string;

  @Prop()
  leadershipPosition: string;

  @Prop()
  admissionYear: number; // student

  @Prop()
  yearOfStudy: string; // student

  @Prop()
  licenseNumber: string; // doctor || globalnewtork

  @Prop()
  specialty: string; // doctor || globalnetwork

  @Prop()
  yearsOfExperience: string; // doctor || globalnetwork

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }] })
  eventsRegistered: Event[];

  @Prop()
  verificationCode: string;

  @Prop()
  passwordResetToken: string;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vacancy' }] })
  volunteerships: Vacancy[];

  @Prop(
    raw({
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      linkedin: { type: String },
    }),
  )
  socials: Record<string, string>;

  @Prop({ default: false })
  subscribed: boolean;

  @Prop()
  subscriptionExpiry: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add pre-save hook to generate sequential membershipID
UserSchema.pre<User>('save', async function (next) {
  if (this.isNew) {
    const CounterModel = this.db.model<Counter>('Counter');
    const counter = await CounterModel.findOneAndUpdate(
      { sequenceName: 'userId' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true },
    );
    this.membershipId = `CM1${String(counter.sequenceValue).padStart(8, '0')}`;
  }
  if (
    this.isNew ||
    this.isModified('firstName') ||
    this.isModified('middleName') ||
    this.isModified('lastName')
  ) {
    this.fullName = (this.firstName + ' ' + (this.middleName || '') + ' ' + this.lastName).trim();
  }
  next();
});

// Generic function to handle update operations
function updateFullNameHook(next) {
  const update = this.getUpdate();
  // Check if the firstName, middleName, or lastName fields are being updated
  if (update.firstName || update.middleName || update.lastName) {
    const fullName =
      `${update.firstName || ''} ${update.middleName || ''} ${update.lastName || ''}`.trim();
    this.setUpdate({ ...update, fullName });
  }
  next();
}

// Apply the generic update hook to all relevant methods
UserSchema.pre('findOneAndUpdate', updateFullNameHook);
UserSchema.pre('updateOne', updateFullNameHook);
