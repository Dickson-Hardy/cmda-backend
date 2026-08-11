import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Devotional extends Document {
  @Prop({ unique: true })
  title: string;

  @Prop()
  content: string;

  @Prop()
  keyVerse: string;

  @Prop()
  keyVerseContent: string;

  @Prop()
  prayerPoints: string;

  @Prop({ type: Date, index: true })
  scheduledFor: Date;
}

export const DevotionalSchema = SchemaFactory.createForClass(Devotional);
