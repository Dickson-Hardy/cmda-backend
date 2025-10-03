import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Counter extends Document {
  @Prop({ required: true })
  sequenceName: string;

  @Prop({ required: true })
  sequenceValue: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
