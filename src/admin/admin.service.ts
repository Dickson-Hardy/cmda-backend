import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin } from './admin.schema';
import { Model } from 'mongoose';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ISuccessResponse } from '../_global/interface/success-response';
import { LoginAdminDto } from './dto/login-admin.dto';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service';
import ShortUniqueId from 'short-unique-id';
import { AdminRole, AllAdminRoles } from './admin.constant';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { ForgotPasswordDto } from '../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { CreateMemberByAdminDto } from './dto/create-member-by-admin.dto';
import { User } from '../users/schema/users.schema';
import { isGlobalCategory } from '../users/user.constant';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<ISuccessResponse> {
    try {
      const { fullName, email, role } = createAdminDto;

      // generate password
      const { randomUUID } = new ShortUniqueId({ length: 5, dictionary: 'alphanum_upper' });
      const pass = randomUUID();
      const password = 'Cmda24@' + pass;

      await this.emailService.sendAdminCredentialsEmail({ name: fullName, email, password });

      const admin = await this.adminModel.create({ fullName, email, role, password });

      return {
        success: true,
        message: 'Admin created successfully',
        data: admin,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(loginDto: LoginAdminDto): Promise<ISuccessResponse> {
    const { email, password } = loginDto;

    const admin = await this.adminModel.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
    if (!admin) throw new UnauthorizedException('Invalid login credentials');

    const isPasswordMatched = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid login credentials');

    const accessToken = this.jwtService.sign({ id: admin._id, email, role: admin.role });
    return {
      success: true,
      message: 'Login successful',
      data: { admin, accessToken },
    };
  }

  async findAll(): Promise<ISuccessResponse> {
    const admins = await this.adminModel.find({}).sort({ createdAt: -1 });
    return {
      success: true,
      message: 'Admins fetched successfully',
      data: admins,
    };
  }

  async findProfile(id: string): Promise<ISuccessResponse> {
    const admin = await this.adminModel.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin with id does not exist');
    }
    return {
      success: true,
      message: 'Admin profile fetched successfully',
      data: admin,
    };
  }

  async updateProfile(id: string, updateAdminDto: UpdateAdminDto): Promise<ISuccessResponse> {
    const { fullName } = updateAdminDto;
    const admin = await this.adminModel.findByIdAndUpdate(id, { fullName }, { new: true });
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin profile updated successfully',
      data: admin,
    };
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangeAdminPasswordDto,
  ): Promise<ISuccessResponse> {
    const { oldPassword, newPassword, confirmPassword } = changePasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const admin = await this.adminModel.findById(id);
    const isPasswordMatched = await bcrypt.compare(oldPassword, admin.password);
    if (!isPasswordMatched) {
      throw new BadRequestException('Old password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await admin.updateOne({ password: hashedPassword });
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async updateRole(id: string, role: AdminRole): Promise<ISuccessResponse> {
    if (!AllAdminRoles.includes(role)) {
      throw new BadRequestException('Role ' + role + ' is not a valid admin role');
    }
    const admin = await this.adminModel.findByIdAndUpdate(id, { role }, { new: true });
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin role updated successfully',
      data: admin,
    };
  }

  async remove(id: string): Promise<ISuccessResponse> {
    const admin = await this.adminModel.findByIdAndDelete(id);
    if (!admin) throw new NotFoundException('Admin with id does not exist');
    return {
      success: true,
      message: 'Admin deleted successfully',
      data: admin,
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<ISuccessResponse> {
    const { email } = forgotPasswordDto;
    const user = await this.adminModel.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
    if (!user) {
      return {
        success: true,
        message: 'Password reset token has been sent to your email if it exists.',
      };
    }
    if (user) {
      const { randomUUID } = new ShortUniqueId({ length: 6, dictionary: 'alphanum_upper' });
      const code = randomUUID();
      const res = await this.emailService.sendPasswordResetTokenEmail({
        name: user.fullName,
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
    const user = await this.adminModel.findOne({ passwordResetToken: token.toUpperCase() });
    if (!user) {
      throw new BadRequestException('Password reset token is invalid');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await user.updateOne({ password: hashedPassword, passwordResetToken: '' });
    await this.emailService.sendPasswordResetSuccessEmail({
      name: user.fullName,
      email: user.email,
    });
    return {
      success: true,
      message: 'Password reset successful',
    };
  }

  async createMemberByAdmin(createMemberDto: CreateMemberByAdminDto): Promise<ISuccessResponse> {
    try {
      const { email, memberCategory, ...memberData } = createMemberDto;

      // Check if email already exists
      const isExists = await this.userModel.findOne({
        email: { $regex: `^${email}$`, $options: 'i' },
      });
      if (isExists) {
        throw new ConflictException('Email already exists');
      }

      // Generate temporary password
      const { randomUUID } = new ShortUniqueId({ length: 5, dictionary: 'alphanum_upper' });
      const pass = randomUUID();
      const tempPassword = 'Cmda24@' + pass;

      // Create the user first to get the ID for tracking
      const tempUser = await this.userModel.create({
        ...memberData,
        email,
        password: await bcrypt.hash(tempPassword, 10),
        memberCategory,
        isGlobal: isGlobalCategory(memberCategory),
        requirePasswordChange: true,
        createdByAdmin: true,
        createdByAdminId: 'admin',
      });

      // Send credentials email to the member with tracking
      await this.emailService.sendMemberCredentialsEmail({
        name: memberData.firstName,
        email,
        password: tempPassword,
        userId: tempUser._id.toString(),
      });

      return {
        success: true,
        message: 'Member account created successfully. Credentials sent to their email.',
        data: tempUser,
      };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async getMemberAnalytics(): Promise<ISuccessResponse> {
    const totalCreated = await this.userModel.countDocuments({ createdByAdmin: true });
    const emailOpened = await this.userModel.countDocuments({
      createdByAdmin: true,
      credentialEmailOpened: true,
    });
    const passwordChanged = await this.userModel.countDocuments({
      createdByAdmin: true,
      initialPasswordChanged: true,
    });
    const pendingPasswordChange = await this.userModel.countDocuments({
      createdByAdmin: true,
      initialPasswordChanged: false,
    });

    // Get list of members pending password change
    const pendingMembers = await this.userModel
      .find({
        createdByAdmin: true,
        initialPasswordChanged: false,
      })
      .select('firstName lastName email createdAt credentialEmailOpened credentialEmailOpenedAt')
      .sort({ createdAt: -1 })
      .limit(50);

    return {
      success: true,
      message: 'Member analytics fetched successfully',
      data: {
        total: totalCreated,
        emailOpenRate: totalCreated > 0 ? ((emailOpened / totalCreated) * 100).toFixed(2) : 0,
        passwordChangeRate:
          totalCreated > 0 ? ((passwordChanged / totalCreated) * 100).toFixed(2) : 0,
        stats: {
          totalCreated,
          emailOpened,
          passwordChanged,
          pendingPasswordChange,
        },
        pendingMembers,
      },
    };
  }

  async trackEmailOpen(userId: string): Promise<ISuccessResponse> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (!user.credentialEmailOpened) {
        await user.updateOne({
          credentialEmailOpened: true,
          credentialEmailOpenedAt: new Date(),
        });
      }

      // Return a 1x1 transparent pixel
      return {
        success: true,
        message: 'Email open tracked',
      };
    } catch (error) {
      throw error;
    }
  }

  async sendPasswordChangeReminders(): Promise<ISuccessResponse> {
    try {
      // Find all admin-created members who haven't changed their password
      const pendingMembers = await this.userModel.find({
        createdByAdmin: true,
        initialPasswordChanged: false,
      });

      if (pendingMembers.length === 0) {
        return {
          success: true,
          message: 'No members pending password change',
          data: { sent: 0, failed: 0 },
        };
      }

      let sent = 0;
      let failed = 0;

      for (const member of pendingMembers) {
        try {
          const createdDate = new Date((member as any).createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          const result = await this.emailService.sendPasswordChangeReminderEmail({
            name: member.firstName,
            email: member.email,
            createdDate,
          });

          if (result.success) {
            await member.updateOne({ passwordChangeReminderSentAt: new Date() });
            sent++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Failed to send reminder to ${member.email}:`, error);
          failed++;
        }
      }

      return {
        success: true,
        message: `Reminder emails sent successfully`,
        data: {
          total: pendingMembers.length,
          sent,
          failed,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}
