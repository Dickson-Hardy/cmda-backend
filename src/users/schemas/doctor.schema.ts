import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type DoctorDocument = Doctor & Document;

@Schema()
export class Doctor {
  @Prop({ required: true })
  region: string;

  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  specialty: string;
}

export const DoctorSchema = SchemaFactory.createForClass(Doctor);
