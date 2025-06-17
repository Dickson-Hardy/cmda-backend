import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import {
  EventAudience,
  EventTag,
  EventType,
  ConferenceType,
  ConferenceZone,
  ConferenceRegion,
  RegistrationPeriod,
} from './events.constant';
import slugify from 'slugify';

class PaymentPlan {
  @Prop({
    required: true,
    enum: Object.values(EventAudience), // Support both legacy and new formats
  })
  role: EventAudience;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ enum: Object.values(RegistrationPeriod) })
  registrationPeriod?: RegistrationPeriod; // Regular or Late registration

  @Prop({ default: true })
  isActive?: boolean; // Allow disabling specific payment plans
}

class RegisteredUser {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop()
  paymentReference?: string; // Only for paid events

  @Prop()
  registrationPeriod?: RegistrationPeriod; // Track when user registered
}

// Conference-specific configuration
class ConferenceConfig {
  @Prop()
  type?: ConferenceType; // Students, Doctors, Global Network

  @Prop()
  zone?: ConferenceZone; // Western, Eastern, Northern (for zonal conferences)

  @Prop()
  region?: ConferenceRegion; // Global regions (for regional conferences)

  @Prop()
  regularRegistrationEndDate?: Date; // End date for regular registration

  @Prop()
  lateRegistrationEndDate?: Date; // End date for late registration

  @Prop()
  paystackSplitCode?: string; // For revenue sharing with zones/regions

  @Prop({ default: false })
  usePayPalForGlobal?: boolean; // Use PayPal for global network payments
}

@Schema({ timestamps: true, versionKey: false })
export class Event extends Document {
  @Prop({ unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ lowercase: true })
  slug: string;

  @Prop()
  featuredImageUrl: string;

  @Prop()
  featuredImageCloudId: string;

  @Prop()
  eventType: EventType;

  @Prop()
  linkOrLocation: string;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ type: [PaymentPlan], default: [] })
  paymentPlans: PaymentPlan[];

  @Prop()
  reference: string;

  @Prop()
  eventTags: EventTag[];

  @Prop()
  eventDateTime: Date;

  @Prop()
  additionalInformation: string;
  @Prop({
    type: [String],
    default: [
      EventAudience.STUDENT,
      EventAudience.DOCTOR_0_5_YEARS,
      EventAudience.DOCTOR_ABOVE_5_YEARS,
      EventAudience.GLOBALNETWORK,
    ],
    enum: Object.values(EventAudience),
  })
  membersGroup: EventAudience[];

  @Prop({ type: [RegisteredUser], default: [] })
  registeredUsers: RegisteredUser[];

  // Conference-specific fields
  @Prop({ type: ConferenceConfig })
  conferenceConfig?: ConferenceConfig;

  @Prop({ default: false })
  isConference: boolean;
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Add instance methods for member group handling
EventSchema.methods.expandMembersGroup = function (): EventAudience[] {
  const expandedAudiences = [...this.membersGroup];

  // If legacy DOCTOR is included, replace with both experience levels
  const doctorIndex = expandedAudiences.indexOf(EventAudience.DOCTOR);
  if (doctorIndex !== -1) {
    expandedAudiences.splice(
      doctorIndex,
      1,
      EventAudience.DOCTOR_0_5_YEARS,
      EventAudience.DOCTOR_ABOVE_5_YEARS,
    );
  }

  return expandedAudiences;
};

EventSchema.methods.canUserSeeEvent = function (
  userRole: string,
  yearsOfExperience?: string,
): boolean {
  const expandedAudiences = this.expandMembersGroup();

  // Determine user's event audience
  let userAudience: EventAudience;
  switch (userRole) {
    case 'Student':
      userAudience = EventAudience.STUDENT;
      break;
    case 'Doctor':
      if (
        !yearsOfExperience ||
        yearsOfExperience.includes('0 - 5') ||
        yearsOfExperience.includes('0-5')
      ) {
        userAudience = EventAudience.DOCTOR_0_5_YEARS;
      } else {
        userAudience = EventAudience.DOCTOR_ABOVE_5_YEARS;
      }
      break;
    case 'GlobalNetwork':
      userAudience = EventAudience.GLOBALNETWORK;
      break;
    default:
      return false;
  }

  return expandedAudiences.includes(userAudience);
};

EventSchema.methods.getPaymentPlanForUser = function (
  userRole: string,
  yearsOfExperience?: string,
  registrationPeriod: RegistrationPeriod = RegistrationPeriod.REGULAR,
) {
  if (!this.isPaid) return null;

  // Determine user's event audience
  let userAudience: EventAudience;
  switch (userRole) {
    case 'Student':
      userAudience = EventAudience.STUDENT;
      break;
    case 'Doctor':
      if (
        !yearsOfExperience ||
        yearsOfExperience.includes('0 - 5') ||
        yearsOfExperience.includes('0-5')
      ) {
        userAudience = EventAudience.DOCTOR_0_5_YEARS;
      } else {
        userAudience = EventAudience.DOCTOR_ABOVE_5_YEARS;
      }
      break;
    case 'GlobalNetwork':
      userAudience = EventAudience.GLOBALNETWORK;
      break;
    default:
      return null;
  }

  // Find payment plan for user's audience and registration period
  let paymentPlan = this.paymentPlans.find(
    (plan: any) =>
      plan.role === userAudience &&
      plan.registrationPeriod === registrationPeriod &&
      plan.isActive !== false,
  );

  // Fallback to legacy DOCTOR plan if user is a doctor and no specific plan found
  if (
    !paymentPlan &&
    (userAudience === EventAudience.DOCTOR_0_5_YEARS ||
      userAudience === EventAudience.DOCTOR_ABOVE_5_YEARS)
  ) {
    paymentPlan = this.paymentPlans.find(
      (plan: any) =>
        plan.role === EventAudience.DOCTOR &&
        plan.registrationPeriod === registrationPeriod &&
        plan.isActive !== false,
    );
  }

  return paymentPlan;
};

// Add pre-save hook to generate slug
EventSchema.pre<Event>('save', async function (next) {
  if (this.isNew) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
