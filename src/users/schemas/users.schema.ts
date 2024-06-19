import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop()
  name: string;

  @Prop({ unique: [true, 'Duplicate email entered'] })
  email: string;

  @Prop()
  password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';
// // import { CounterDocument } from 'src/counter/counter.module';

// export type UserDocument = User & Document;

// export enum UserRole {
//   STUDENT = 'Student',
//   DOCTOR = 'Doctor',
//   GLOBALNETWORK = 'GlobalNetwork',
// }

// export enum UserGender {
//   MALE = 'Male',
//   FEMALE = 'Female',
// }

// @Schema({ timestamps: true })
// export class User {
//   // @Prop({ unique: true })
//   // id: number;

//   @Prop()
//   firstName: string;

//   // @Prop()
//   // middleName: string;

//   @Prop()
//   lastName: string;

//   @Prop()
//   password: string;

//   @Prop()
//   email: string;

//   // @Prop()
//   // phone: string;

//   // @Prop({ required: true })
//   // gender: UserGender;

//   // @Prop({ required: true })
//   // role: UserRole;

//   // @Prop()
//   // membershipId: string;
// }

// export const UserSchema = SchemaFactory.createForClass(User);

// // // Add pre-save hook to generate sequential ID and update membershipId
// // UserSchema.pre<UserDocument>('save', async function (next) {
// //   if (this.isNew) {
// //     const CounterModel = this.db.model<CounterDocument>('Counter');
// //     const counter = await CounterModel.findOneAndUpdate(
// //       { sequenceName: 'userId' },
// //       { $inc: { sequenceValue: 1 } },
// //       { new: true, upsert: true },
// //     );
// //     this.id = counter.sequenceValue;
// //     this.membershipId = `CM1${String(this.id).padStart(8, '0')}`;
// //   }
// //   next();
// // });
