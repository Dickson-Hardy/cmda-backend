import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { AllEventAudiences, EventAudience, EventTag, EventType } from './events.constant';
import slugify from 'slugify';

class PaymentPlan {
  @Prop({ required: true })
  role: EventAudience;

  @Prop({ required: true })
  price: number;
}

class RegisteredUser {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId;

  @Prop()
  paymentReference?: string; // Only for paid events
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
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Add pre-save hook to generate slug
EventSchema.pre<Event>('save', async function (next) {
  if (this.isNew) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
