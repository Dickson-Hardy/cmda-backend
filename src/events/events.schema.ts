import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { EventAudience, EventCategory } from './events.constant';
import slugify from 'slugify';
import { User } from '../users/users.schema';

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
  location: string;

  @Prop()
  region: string[];

  @Prop()
  date: Date;

  @Prop()
  category: EventCategory;

  @Prop({ default: ['All'] })
  audience: EventAudience[];

  @Prop({ default: 0 })
  price: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  participants: User[];
}

export const EventSchema = SchemaFactory.createForClass(Event);

// Add pre-save hook to generate slug
EventSchema.pre<Event>('save', async function (next) {
  if (this.isNew) {
    this.slug = slugify(this.name, { lower: true });
  }
  next();
});
