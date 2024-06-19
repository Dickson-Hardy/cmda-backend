import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export type StudentDocument = Student & Document;

@Schema()
export class Student {
  @Prop({ required: true })
  chapter: string;

  @Prop({ required: true })
  admissionYear: string;

  @Prop({ required: true })
  currentYearOfStudy: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
