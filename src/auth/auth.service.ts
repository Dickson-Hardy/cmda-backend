import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/users.schema';
import { ISuccessResponse } from '../_global/interface/success-response';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '../users/user.constant';
import { UpdateUserDto } from './dto/update-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password-dto';
import { EmailService } from '../email/email.service';
import ShortUniqueId from 'short-unique-id';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      return payload;
    } catch {
      throw new UnauthorizedException();
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
        ...createUserDto
      } = signUpDto;

      // check for role specific fields and throw error
      if (role === UserRole.STUDENT) {
        if (!admissionYear || !yearOfStudy)
          throw new BadRequestException('admissionYear, yearOfStudy are compulsory for students');
      } else {
        if (!licenseNumber || !specialty) {
          throw new BadRequestException(
            'licenseNumber, specialty are compulsory for doctors / globalnetwork members',
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
          : { licenseNumber, specialty }),
      });
      // accessToken using id and email
      const accessToken = this.jwtService.sign({ id: user._id, email, role: user.role });
      // send welcome mail
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const code = randomUUID();
      const res = await this.emailService.sendWelcomeEmail({
        name: user.firstName,
        email,
        code,
      });
      if (res.success) {
        await user.updateOne({ verificationCode: code });
      } else {
        throw new InternalServerErrorException('Error on email server but user was created');
      }
      // return response
      return {
        success: true,
        message: 'Registration successful',
        data: { user, accessToken },
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
    const user = await this.userModel.findOne({ email });
    if (!user) throw new UnauthorizedException('Invalid email or password');
    // check if password matches
    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid email or password');
    // generate access token
    const accessToken = this.jwtService.sign({ id: user._id, email, role: user.role });
    // return response
    return {
      success: true,
      message: 'Login successful',
      data: { user, accessToken },
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
    const { admissionYear, yearOfStudy, licenseNumber, specialty, ...otherUpdateData } =
      updateProfileDto;
    // remove unpermitted role fields
    if (user.role === UserRole.STUDENT) {
      delete updateProfileDto.licenseNumber;
      delete updateProfileDto.specialty;
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
          : { licenseNumber, specialty }),
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
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('Email does not exist');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }
    const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
    const code = randomUUID();
    const res = await this.emailService.sendVerificationCodeEmail({
      name: user.firstName,
      email,
      code,
    });
    if (res.success) {
      await user.updateOne({ verificationCode: code });
    } else {
      throw new InternalServerErrorException('Error on email server, please try again later');
    }

    return {
      success: true,
      message: 'Email verification code resent successfully',
    };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<ISuccessResponse> {
    const { code, email } = verifyEmailDto;
    const user = await this.userModel.findOne({ email, verificationCode: code.toUpperCase() });
    if (!user) {
      throw new BadRequestException('Email verification code is invalid');
    }
    await user.updateOne({ emailVerified: true, verificationCode: '' });
    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ISuccessResponse> {
    const { email } = forgotPasswordDto;
    const user = await this.userModel.findOne({ email });
    if (user) {
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const code = randomUUID();
      const res = await this.emailService.sendPasswordResetTokenEmail({
        name: user.firstName,
        email,
        code,
      });
      if (res.success) {
        await user.updateOne({ passwordResetToken: code });
      } else {
        throw new InternalServerErrorException('Error on email server, please try again later');
      }
    }
    return {
      success: true,
      message: "Password reset token has been sent to your email if it exists'",
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ISuccessResponse> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.userModel.findOne({ passwordResetToken: token.toUpperCase() });
    if (!user) {
      throw new BadRequestException('Password reset token is invalid');
    }
    await user.updateOne({ password: newPassword, passwordResetToken: '' });
    await this.emailService.sendPasswordResetSuccessEmail({
      name: user.firstName,
      email: user.email,
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
    await user.updateOne({ password: hashedPassword });
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }
}
