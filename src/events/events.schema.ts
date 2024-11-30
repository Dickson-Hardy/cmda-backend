import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { AllEventAudiences, EventAudience, EventTag, EventType } from './events.constant';
import slugify from 'slugify';
import { User } from '../users/schema/users.schema';

class PaymentPlan {
  @Prop({ required: true })
  role: EventAudience;

  @Prop({ required: true })
  price: number;
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
  eventTags: EventTag[];

  @Prop()
  eventDateTime: Date;

  @Prop()
  additionalInformation: string;

  @Prop({ default: AllEventAudiences })
  membersGroup: EventAudience[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    index: { unique: true, sparse: true },
    default: [],
  })
  registeredUsers: User[];
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Add pre-save hook to generate slug
EventSchema.pre<Event>('save', async function (next) {
  if (this.isNew) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
