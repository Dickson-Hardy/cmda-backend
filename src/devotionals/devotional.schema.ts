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
}

export const DevotionalSchema = SchemaFactory.createForClass(Devotional);
