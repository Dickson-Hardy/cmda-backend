import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schema/users.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/user.constant';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password-dto';
import { CheckUserDto } from './dto/check-user.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { EmailService } from '../email/email.service';
import ShortUniqueId from 'short-unique-id';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Admin } from '../admin/admin.schema';
import { AdminRole, AllAdminRoles } from '../admin/admin.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { createHash, randomUUID } from 'crypto';
import { escapeRegex } from '../_common/escape-regex.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    @InjectModel(Admin.name)
    private adminModel: Model<Admin>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async validateToken(token: string): Promise<IJwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<IJwtPayload>(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (payload.type !== 'access') throw new Error('Incorrect token type');

      const account: any = await this.accountModel(payload.role)
        .findById(payload.id)
        .select('tokenVersion isActive isBanned')
        .lean();
      if (!account || (account.tokenVersion || 0) !== payload.tokenVersion) {
        throw new Error('Session revoked');
      }
      if (!AllAdminRoles.includes(payload.role as AdminRole)) {
        if (account.isActive === false || account.isBanned === true) {
          throw new Error('Account unavailable');
        }
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token provided');
    }
  }

  async signUp(signUpDto: CreateUserDto): Promise<ISuccessResponse> {
    try {
      const {
        email,
        password,
        role,
        admissionYear, // student
        yearOfStudy, // student
        licenseNumber, // doctor || globalnetwork
        specialty, // doctor || globalnetwork
        yearsOfExperience, // doctor || globalnetwork
        ...createUserDto
      } = signUpDto;

      // check for role specific fields and throw error
      if (role === UserRole.STUDENT) {
        if (!admissionYear || !yearOfStudy)
          throw new BadRequestException('admissionYear, yearOfStudy are compulsory for students');
      } else {
        if (!licenseNumber || !specialty || !yearsOfExperience) {
          throw new BadRequestException(
            'licenseNumber, specialty, yearsOfExperience are compulsory for doctors / globalnetwork members',
          );
        }
      }
      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      // create user based on role && ignore non-related fields
      const user = await this.userModel.create({
        ...createUserDto,
        email,
        password: hashedPassword,
        role,
        ...(role === UserRole.STUDENT
          ? { admissionYear, yearOfStudy }
          : { licenseNumber, specialty, yearsOfExperience }),
      });
      // accessToken using id and email
      const tokens = await this.issueTokenPair({
        id: user._id.toString(),
        email: user.email,
        role: user.role,
      });
      // send welcome mail
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'number' });
      const code = randomUUID();
      // Save verification code first, then send email in background
      await user.updateOne({
        verificationCode: code,
        verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      // Send email asynchronously without blocking
      this.emailService
        .sendWelcomeEmail({
          name: user.firstName,
          email,
          code,
        })
        .catch((error) => {
          console.error('Failed to send welcome email:', error);
        });
      // return response
      return {
        success: true,
        message: 'Registration successful',
        data: { user, ...tokens },
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<ISuccessResponse> {
    const { email, password } = loginDto;
    // check if user with email exists
    const user = await this.userModel.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    // check if password matches
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid email or password');
    // generate access token
    const tokens = await this.issueTokenPair({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    // return response with requirePasswordChange flag
    return {
      success: true,
      message: 'Login successful',
      data: { user, ...tokens, requirePasswordChange: user.requirePasswordChange || false },
    };
  }

  async getProfile(id: string): Promise<ISuccessResponse> {
    const user = await this.userModel.findById(id).populate('eventsRegistered', '_id, name');
    return {
      success: true,
      message: 'Profile fetched successfully',
      data: user,
    };
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateUserDto,
    file: Express.Multer.File,
  ): Promise<ISuccessResponse> {
    const NON_EDITABLES = [
      '_id',
      'membershipId',
      'email',
      'eventsRegistered',
      'avatarUrl',
      'avatarCloudId',
      'role',
    ];
    NON_EDITABLES.forEach((key) => {
      delete updateProfileDto[key];
    });
    const user = await this.userModel.findById(id);
    const {
      admissionYear,
      yearOfStudy,
      licenseNumber,
      specialty,
      yearsOfExperience,
      ...otherUpdateData
    } = updateProfileDto;
    // remove unpermitted role fields
    if (user.role === UserRole.STUDENT) {
      delete updateProfileDto.licenseNumber;
      delete updateProfileDto.specialty;
      delete updateProfileDto.yearsOfExperience;
    } else {
      delete updateProfileDto.admissionYear;
      delete updateProfileDto.yearOfStudy;
    }

    let [avatarUrl, avatarCloudId] = [user.avatarUrl, user.avatarCloudId];
    if (file) {
      const upload = await this.cloudinaryService.uploadFile(file, 'avatars');
      if (upload.url) {
        avatarUrl = upload.secure_url;
        avatarCloudId = upload.public_id;
        // delete previous file
        if (user.avatarCloudId) {
          await this.cloudinaryService.deleteFile(user.avatarCloudId);
        }
      }
    }

    const newUser = await this.userModel.findByIdAndUpdate(
      user._id,
      {
        ...otherUpdateData,
        ...(user.role === UserRole.STUDENT
          ? { admissionYear, yearOfStudy }
          : { licenseNumber, specialty, yearsOfExperience }),
        avatarUrl,
        avatarCloudId,
      },
      { new: true },
    );

    return {
      success: true,
      message: 'Profile updated successfully',
      data: newUser,
    };
  }

  async resendVerifyCode(resendCodeDto: ForgotPasswordDto): Promise<ISuccessResponse> {
    const { email } = resendCodeDto;
    const user = await this.userModel.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
    if (!user) {
      throw new NotFoundException('Email does not exist');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'number' });
    const code = randomUUID();
    // Save verification code first, then send email in background
    await user.updateOne({
      verificationCode: code,
      verificationCodeExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    });

    // Send email asynchronously without blocking
    this.emailService
      .sendVerificationCodeEmail({
        name: user.firstName,
        email,
        code,
      })
      .catch((error) => {
        console.error('Failed to send verification code email:', error);
      });

    return {
      success: true,
      message: 'Email verification code resent successfully',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<ISuccessResponse> {
    const { code, email } = verifyEmailDto;
    const user = await this.userModel.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
      verificationCode: code.toUpperCase(),
      verificationCodeExpires: { $gt: new Date() },
    });
    if (!user) {
      throw new BadRequestException('Email verification code is invalid or expired');
    }
    await user.updateOne({ emailVerified: true, verificationCode: '', verificationCodeExpires: null });
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ISuccessResponse> {
    const { email } = forgotPasswordDto;
    const user = await this.userModel.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
    if (!user) {
      throw new NotFoundException('Email does not exist');
    }
    if (user) {
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'number' });
      const code = randomUUID();
      // Save the token first, then send email in background (non-blocking)
      await user.updateOne({
        passwordResetToken: code,
        passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      // Send email asynchronously without blocking the response
      this.emailService
        .sendPasswordResetTokenEmail({
          name: user.firstName,
          email,
          code,
        })
        .catch((error) => {
          console.error('Failed to send password reset email:', error);
          // Log but don't throw - email failure shouldn't block the user
        });
    }
    return {
      success: true,
      message: "Password reset token has been sent to your email if it exists",
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ISuccessResponse> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.userModel.findOne({
      passwordResetToken: token.toUpperCase(),
      passwordResetTokenExpires: { $gt: new Date() },
    });
    if (!user) {
      throw new BadRequestException('Password reset token is invalid or expired');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.updateOne({
      $set: {
        password: hashedPassword,
        passwordResetToken: '',
        passwordResetTokenExpires: null,
        refreshSessions: [],
      },
      $inc: { tokenVersion: 1 },
    });

    // Send success email asynchronously without blocking
    this.emailService
      .sendPasswordResetSuccessEmail({
        name: user.firstName,
        email: user.email,
      })
      .catch((error) => {
        console.error('Failed to send password reset success email:', error);
      });

    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ISuccessResponse> {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.userModel.findById(id);
    const isPasswordMatched = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordMatched) {
      throw new BadRequestException('Old password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    // Clear requirePasswordChange flag when user successfully changes password
    const updateData: any = {
      password: hashedPassword,
      requirePasswordChange: false,
      refreshSessions: [],
    };

    // Track initial password change for admin-created accounts
    if (user.createdByAdmin && !user.initialPasswordChanged) {
      updateData.initialPasswordChanged = true;
      updateData.initialPasswordChangedAt = new Date();
      updateData.isVerified = true; // Auto-verify when admin-created user changes password
    }

    await user.updateOne({ $set: updateData, $inc: { tokenVersion: 1 } });
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async checkUserExists(checkUserDto: CheckUserDto): Promise<ISuccessResponse> {
    return {
      success: true,
      message: 'User check completed',
      data: {
        exists: false,
      },
    };
  }

  /**
   * Verify user's password
   * Requirements: 6.5 - Require password confirmation when disabling biometric or PIN
   */
  async verifyPassword(
    id: string,
    verifyPasswordDto: VerifyPasswordDto,
  ): Promise<ISuccessResponse> {
    const { password } = verifyPasswordDto;
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) {
      throw new UnauthorizedException('Password is incorrect');
    }
    return {
      success: true,
      message: 'Password verified successfully',
    };
  }

  /**
   * Sign out from all devices by invalidating all tokens
   * Requirements: 6.7 - Invalidate all active tokens when "Sign out of all devices" is triggered
   */
  async logoutAllDevices(id: string, role: AdminRole | UserRole): Promise<ISuccessResponse> {
    const account = await this.accountModel(role).findByIdAndUpdate(id, {
      $inc: { tokenVersion: 1 },
      $set: { refreshSessions: [], lastLogoutAll: new Date() },
    });
    if (!account) throw new NotFoundException('Account not found');

    return {
      success: true,
      message: 'Successfully signed out from all devices',
    };
  }

  /**
   * Refresh access token
   * Requirements: 3.2 - Auto-refresh token when within 24 hours of expiration
   */
  async refreshToken(refreshToken: string): Promise<ISuccessResponse> {
    let payload: IJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<IJwtPayload>(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const model = this.accountModel(payload.role);
    const account: any = await model
      .findById(payload.id)
      .select('email role tokenVersion refreshSessions isActive isBanned')
      .lean();
    if (!account || (account.tokenVersion || 0) !== payload.tokenVersion) {
      throw new UnauthorizedException('Session has been revoked');
    }
    if (
      !AllAdminRoles.includes(payload.role as AdminRole) &&
      (account.isActive === false || account.isBanned === true)
    ) {
      throw new UnauthorizedException('Account unavailable');
    }

    const oldHash = this.hashToken(refreshToken);
    const session = account.refreshSessions?.find(
      (item) =>
        item.sessionId === payload.sessionId &&
        item.tokenHash === oldHash &&
        new Date(item.expiresAt).getTime() > Date.now(),
    );
    if (!session) {
      await model.updateOne(
        { _id: payload.id },
        { $pull: { refreshSessions: { sessionId: payload.sessionId } } },
      );
      throw new UnauthorizedException('Refresh token has already been used or revoked');
    }

    const tokens = await this.createTokenPair(
      {
        id: payload.id,
        email: account.email,
        role: account.role,
        tokenVersion: account.tokenVersion || 0,
      },
      payload.sessionId,
    );

    const update = await model.updateOne(
      {
        _id: payload.id,
        tokenVersion: payload.tokenVersion,
        refreshSessions: {
          $elemMatch: {
            sessionId: payload.sessionId,
            tokenHash: oldHash,
            expiresAt: { $gt: new Date() },
          },
        },
      },
      {
        $set: {
          'refreshSessions.$.tokenHash': this.hashToken(tokens.refreshToken),
          'refreshSessions.$.expiresAt': tokens.refreshTokenExpiresAt,
        },
      },
    );
    if (update.modifiedCount !== 1) {
      await model.updateOne(
        { _id: payload.id },
        { $pull: { refreshSessions: { sessionId: payload.sessionId } } },
      );
      throw new UnauthorizedException('Refresh token has already been used or revoked');
    }

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  async issueTokenPair(identity: {
    id: string;
    email: string;
    role: AdminRole | UserRole;
  }) {
    const model = this.accountModel(identity.role);
    const account: any = await model.findById(identity.id).select('tokenVersion').lean();
    if (!account) throw new NotFoundException('Account not found');

    const sessionId = randomUUID();
    const tokens = await this.createTokenPair(
      { ...identity, tokenVersion: account.tokenVersion || 0 },
      sessionId,
    );
    const session = {
      sessionId,
      tokenHash: this.hashToken(tokens.refreshToken),
      expiresAt: tokens.refreshTokenExpiresAt,
      createdAt: new Date(),
    };

    await model.updateOne(
      { _id: identity.id },
      {
        $set: { tokenVersion: account.tokenVersion || 0 },
        $push: { refreshSessions: { $each: [session], $slice: -10 } },
      },
    );
    return tokens;
  }

  private async createTokenPair(
    identity: {
      id: string;
      email: string;
      role: AdminRole | UserRole;
      tokenVersion: number;
    },
    sessionId: string,
  ) {
    const accessToken = await this.jwtService.signAsync(
      { ...identity, type: 'access', sessionId },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRE') || '15m') as any,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...identity, type: 'refresh', sessionId },
      {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRE') || '30d') as any,
      },
    );
    const accessPayload = this.jwtService.decode(accessToken) as IJwtPayload;
    const refreshPayload = this.jwtService.decode(refreshToken) as IJwtPayload;
    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(accessPayload.exp * 1000),
      refreshTokenExpiresAt: new Date(refreshPayload.exp * 1000),
    };
  }

  private accountModel(role: AdminRole | UserRole): Model<any> {
    return AllAdminRoles.includes(role as AdminRole) ? this.adminModel : this.userModel;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
