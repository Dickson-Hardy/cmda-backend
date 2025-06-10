import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import {
  AllEventAudiences,
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
  @Prop({ required: true })
  role: EventAudience;

  @Prop({ required: true })
  price: number;

  @Prop()
  registrationPeriod?: RegistrationPeriod; // Regular or Late registration
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

  @Prop({ default: AllEventAudiences })
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

// Add pre-save hook to generate slug
EventSchema.pre<Event>('save', async function (next) {
  if (this.isNew) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
