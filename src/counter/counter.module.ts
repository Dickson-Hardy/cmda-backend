import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type CounterDocument = Counter & Document;

@Schema()
export class Counter {
  @Prop({ required: true })
  sequenceName: string;

  @Prop({ required: true })
  sequenceValue: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
