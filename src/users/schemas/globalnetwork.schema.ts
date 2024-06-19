import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type GlobalNetworkDocument = GlobalNetwork & Document;

@Schema()
export class GlobalNetwork {
  @Prop({ required: true })
  country: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  specialty: string;
}

export const GlobalNetworkSchema = SchemaFactory.createForClass(GlobalNetwork);
