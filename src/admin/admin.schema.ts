import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AdminRole } from './admin.constant';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform(doc, ret: any) {
      delete ret.password;
      delete ret.passwordResetToken;
      delete ret.refreshSessions;
    },
  },
})
export class Admin extends Document {
  @Prop()
  fullName: string;

  @Prop({ unique: true, lowercase: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  role: AdminRole;

  @Prop()
  passwordResetToken: string;

  @Prop()
  passwordResetTokenExpires: Date;

  @Prop({ default: 0 })
  tokenVersion: number;

  @Prop({
    type: [
      {
        sessionId: { type: String, required: true },
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        createdAt: { type: Date, required: true },
      },
    ],
    default: [],
  })
  refreshSessions: Array<{
    sessionId: string;
    tokenHash: string;
    expiresAt: Date;
    createdAt: Date;
  }>;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);

// Hash password before saving
AdminSchema.pre<Admin>('save', async function (next) {
  if (this.password && (this.isNew || this.isModified('password'))) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});
