import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class ZelleSettings extends Document {
  @Prop({ unique: true, default: 'zelle' }) key: string;
  @Prop({ default: false }) enabled: boolean;
  @Prop() accountName: string;
  @Prop() recipient: string;
  @Prop() instructions: string;
  @Prop() updatedBy: string;
}
export const ZelleSettingsSchema = SchemaFactory.createForClass(ZelleSettings);
