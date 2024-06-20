import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Counter } from '../counter/counter.module';

export enum UserRole {
  STUDENT = 'Student',
  DOCTOR = 'Doctor',
  GLOBALNETWORK = 'GlobalNetwork',
}

export enum UserGender {
  MALE = 'Male',
  FEMALE = 'Female',
}

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret._id;
    },
  },
})
export class User extends Document {
  @Prop()
  id: number;

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

  @Prop({ unique: [true, 'Duplicate email entered'] })
  email: string;

  @Prop()
  password: string;

  @Prop()
  phone?: string;

  @Prop()
  gender: UserGender;

  @Prop()
  role: UserRole;

  @Prop()
  membershipId: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  region: string; // chapter for student, state for doctors / global network

  @Prop()
  admissionYear: number; // student

  @Prop()
  yearOfStudy: string; // student

  @Prop()
  licenseNumber: string; // doctor || globalnewtork

  @Prop()
  specialty: string; // doctor || globalnetwork

  @Prop()
  country: string; // globalnetwork
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add pre-save hook to generate sequential ID and update membershipId
UserSchema.pre<User>('save', async function (next) {
  if (this.isNew) {
    const CounterModel = this.db.model<Counter>('Counter');
    const counter = await CounterModel.findOneAndUpdate(
      { sequenceName: 'userId' },
      { $inc: { sequenceValue: 1 } },
      { new: true, upsert: true },
    );
    this.id = counter.sequenceValue;
    this.membershipId = `CM1${String(this.id).padStart(8, '0')}`;
  }
  next();
});
