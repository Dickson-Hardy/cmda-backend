import { randomBytes } from 'crypto';
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
import { EmailService } from '../email/email.service';
import ShortUniqueId from 'short-unique-id';
import { AdminRole, AllAdminRoles } from './admin.constant';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ChangeAdminPasswordDto } from './dto/change-admin-password.dto';
import { ForgotPasswordDto } from '../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { CreateMemberByAdminDto } from './dto/create-member-by-admin.dto';
import { User } from '../users/schema/users.schema';
import { isGlobalCategory, UserRole } from '../users/user.constant';
import { AuthService } from '../auth/auth.service';
import { escapeRegex } from '../_common/escape-regex.util';
import { MemberAnalyticsQueryDto } from './dto/member-analytics-query.dto';
import {
  ConfirmLifetimeMemberImportDto,
  LifetimeMemberImportRowDto,
  PreviewLifetimeMemberImportDto,
} from './dto/lifetime-member-import.dto';
import {
  LIFETIME_MEMBERSHIPS,
  NIGERIAN_LIFETIME_MEMBERSHIP,
} from '../subscriptions/subscription.constant';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
    @InjectModel(User.name) private userModel: Model<User>,
    private emailService: EmailService,
    private authService: AuthService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<ISuccessResponse> {
    try {
      const { fullName, email, role } = createAdminDto;

      // generate password
      const password = randomBytes(12).toString('base64url');

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

    const admin = await this.adminModel.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
    });
    if (!admin) throw new UnauthorizedException('Invalid login credentials');

    const isPasswordMatched = await bcrypt.compare(password, admin.password);
    if (!isPasswordMatched) throw new UnauthorizedException('Invalid login credentials');

    const tokens = await this.authService.issueTokenPair({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });
    return {
      success: true,
      message: 'Login successful',
      data: { admin, ...tokens },
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
    await admin.updateOne({
      $set: { password: hashedPassword, refreshSessions: [] },
      $inc: { tokenVersion: 1 },
    });
    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async updateRole(id: string, role: AdminRole): Promise<ISuccessResponse> {
    if (!AllAdminRoles.includes(role)) {
      throw new BadRequestException('Role ' + role + ' is not a valid admin role');
    }
    const admin = await this.adminModel.findByIdAndUpdate(
      id,
      { $set: { role, refreshSessions: [] }, $inc: { tokenVersion: 1 } },
      { new: true },
    );
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
    const user = await this.adminModel.findOne({
      email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
    });
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
        await user.updateOne({
          passwordResetToken: code,
          passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });
      } else {
        throw new InternalServerErrorException('Error on email server, please try again later');
      }
    }
    return {
      success: true,
      message: 'Password reset token has been sent to your email if it exists',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ISuccessResponse> {
    const { token, newPassword, confirmPassword } = resetPasswordDto;
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('confirmPassword does not match newPassword');
    }
    const user = await this.adminModel.findOne({
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
        email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' },
      });
      if (isExists) {
        throw new ConflictException('Email already exists');
      }

      // Generate temporary password
      const tempPassword = randomBytes(12).toString('base64url');

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
        isVerified: true, // Auto-verify admin-created members
        emailVerified: true, // Skip email verification for admin-created members
      });

      // Send credentials email to the member with tracking
      await this.emailService.sendMemberCredentialsEmail({
        name: memberData.firstName,
        email,
        password: tempPassword,
        userId: tempUser._id.toString(),
        role: tempUser.role,
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

  async previewLifetimeMemberImport(
    body: PreviewLifetimeMemberImportDto,
  ): Promise<ISuccessResponse> {
    const members = await this.userModel
      .find({})
      .select(
        '_id fullName firstName lastName email phone role region memberCategory hasLifetimeMembership lifetimeMembershipType',
      )
      .lean();

    const initiallyMatchedRows: any[] = body.rows.map((row) =>
      this.matchLifetimeImportRow(row, members),
    );
    const matchedUserCounts = initiallyMatchedRows.reduce((counts, row) => {
      if (row.status === 'matched') {
        counts.set(row.match.userId, (counts.get(row.match.userId) || 0) + 1);
      }
      return counts;
    }, new Map<string, number>());
    const rows = initiallyMatchedRows.map((row) =>
      row.status === 'matched' && matchedUserCounts.get(row.match.userId) > 1
        ? {
            ...row,
            status: 'ambiguous',
            reason: 'This member appears more than once in the spreadsheet',
            candidates: [row.match],
            match: undefined,
          }
        : row,
    );
    const counts = rows.reduce(
      (result, row) => {
        result[row.status] += 1;
        return result;
      },
      { matched: 0, ambiguous: 0, unmatched: 0, invalid: 0 },
    );

    return {
      success: true,
      message: 'Lifetime-member sheet matched successfully',
      data: { fileName: body.fileName, rows, counts, total: rows.length },
    };
  }

  async confirmLifetimeMemberImport(
    body: ConfirmLifetimeMemberImportDto,
    importedBy: string,
  ): Promise<ISuccessResponse> {
    const ids = body.rows.map((row) => row.userId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('A member can only be confirmed once per import');
    }

    const members = await this.userModel
      .find({})
      .select(
        '_id fullName firstName lastName email phone role region memberCategory hasLifetimeMembership lifetimeMembershipType',
      )
      .lean();
    const selectedIds = new Set(ids);
    const memberMap = new Map(
      members
        .filter((member: any) => selectedIds.has(member._id.toString()))
        .map((member: any) => [member._id.toString(), member]),
    );
    const operations = [];
    const results = [];

    for (const row of body.rows) {
      const member: any = memberMap.get(row.userId);
      if (!member) {
        results.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: 'Member no longer exists',
        });
        continue;
      }
      if (member.hasLifetimeMembership) {
        results.push({
          rowNumber: row.rowNumber,
          status: 'skipped',
          reason: 'Member already has lifetime membership',
        });
        continue;
      }

      const match: any = this.matchLifetimeImportRow(row, members);
      const allowedIds = [match.match, ...(match.candidates || [])]
        .filter(Boolean)
        .map((candidate) => candidate.userId);
      if (!['matched', 'ambiguous'].includes(match.status) || !allowedIds.includes(row.userId)) {
        results.push({
          rowNumber: row.rowNumber,
          status: 'failed',
          reason: 'Member details changed or no longer match this spreadsheet row',
        });
        continue;
      }

      const lifetimeType = this.resolveLifetimeType(row.category, member.role);
      const years =
        lifetimeType === 'lifetime'
          ? NIGERIAN_LIFETIME_MEMBERSHIP.lifetime.years
          : LIFETIME_MEMBERSHIPS[lifetimeType as keyof typeof LIFETIME_MEMBERSHIPS].years;
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + years);

      const set: Record<string, any> = {
        subscribed: true,
        subscriptionExpiry: expiryDate,
        hasLifetimeMembership: true,
        lifetimeMembershipType: lifetimeType,
        lifetimeMembershipExpiry: expiryDate,
        lifetimeImportedAt: new Date(),
        lifetimeImportSource: body.fileName,
        lifetimeImportedBy: importedBy,
        lifetimeImportRow: row.rowNumber,
      };
      if (!member.phone && row.phone) set.phone = row.phone.trim();
      if (!member.region && row.chapter) set.region = row.chapter.trim();

      operations.push({
        updateOne: {
          filter: { _id: member._id },
          update: { $set: set },
        },
      });
      results.push({
        rowNumber: row.rowNumber,
        status: 'imported',
        userId: row.userId,
        fullName: member.fullName,
        lifetimeType,
      });
    }

    if (operations.length) await this.userModel.bulkWrite(operations, { ordered: false });

    return {
      success: true,
      message: `${operations.length} lifetime member${operations.length === 1 ? '' : 's'} imported`,
      data: {
        imported: operations.length,
        failed: results.filter((row) => row.status === 'failed').length,
        skipped: results.filter((row) => row.status === 'skipped').length,
        results,
      },
    };
  }

  private matchLifetimeImportRow(row: LifetimeMemberImportRowDto, members: any[]) {
    const email = this.normalizeEmail(row.email);
    const phone = this.normalizePhone(row.phone);
    const name = this.normalizeName(row.fullName);
    if (!name || (!email && !phone)) {
      return {
        ...row,
        status: 'invalid',
        reason: 'Full name and at least an email address or phone number are required',
      };
    }
    const emailMatches = email
      ? members.filter((member) => this.normalizeEmail(member.email) === email)
      : [];
    const phoneMatches = phone
      ? members.filter((member) => this.normalizePhone(member.phone) === phone)
      : [];
    const nameMatches = members.filter((member) => this.normalizeName(member.fullName) === name);
    const strongIds = new Set(
      [...emailMatches, ...phoneMatches].map((member: any) => member._id.toString()),
    );

    if (strongIds.size > 1) {
      return {
        ...row,
        status: 'ambiguous',
        reason: 'Email and phone point to different member accounts',
        candidates: [...emailMatches, ...phoneMatches]
          .filter(
            (member, index, all) =>
              all.findIndex((item) => item._id.toString() === member._id.toString()) === index,
          )
          .map((member) => this.importCandidate(member)),
      };
    }

    let candidate =
      strongIds.size === 1
        ? members.find((member) => member._id.toString() === [...strongIds][0])
        : undefined;
    let confidence = emailMatches.length ? 'exact email' : phoneMatches.length ? 'exact phone' : '';

    if (!candidate && nameMatches.length === 1) {
      candidate = nameMatches[0];
      confidence = 'exact name';
    }
    if (!candidate && nameMatches.length > 1) {
      return {
        ...row,
        status: 'ambiguous',
        reason:
          'More than one member has this full name; add email or phone to identify the correct account',
        candidates: nameMatches.slice(0, 5).map((member) => this.importCandidate(member)),
      };
    }
    if (!candidate) {
      return { ...row, status: 'unmatched', reason: 'No existing member account matched' };
    }

    const lifetimeTypeError = this.getLifetimeTypeError(row.category, candidate.role);
    if (lifetimeTypeError) {
      return {
        ...row,
        status: 'invalid',
        reason: lifetimeTypeError,
        candidates: [this.importCandidate(candidate)],
      };
    }

    const nameAgrees = this.normalizeName(candidate.fullName) === name;
    if ((emailMatches.length || phoneMatches.length) && !nameAgrees) {
      return {
        ...row,
        status: 'ambiguous',
        reason: `${confidence} found, but the full name does not agree`,
        candidates: [this.importCandidate(candidate)],
      };
    }

    const proposedUpdates = [];
    if (!candidate.phone && row.phone) proposedUpdates.push(`Add phone: ${row.phone}`);
    if (!candidate.region && row.chapter)
      proposedUpdates.push(`Add chapter/region: ${row.chapter}`);

    return {
      ...row,
      status: 'matched',
      reason: confidence || 'exact name',
      match: this.importCandidate(candidate),
      proposedUpdates,
    };
  }

  private importCandidate(member: any) {
    return {
      userId: member._id.toString(),
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      role: member.role,
      chapter: member.region,
      memberCategory: member.memberCategory,
      alreadyLifetime: Boolean(member.hasLifetimeMembership),
      lifetimeType: member.lifetimeMembershipType,
    };
  }

  private normalizeEmail(value?: string) {
    return value?.trim().toLowerCase() || '';
  }

  private normalizePhone(value?: string) {
    const digits = value?.replace(/\D/g, '') || '';
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }

  private normalizeName(value?: string) {
    return (value || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getLifetimeTypeError(category: string | undefined, role: string): string | undefined {
    if (role !== UserRole.GLOBALNETWORK) return undefined;
    const normalized = (category || '').toLowerCase();
    if (['gold', 'platinum', 'diamond'].some((type) => normalized.includes(type))) return undefined;
    return 'Global Network lifetime members require a Gold, Platinum or Diamond category';
  }

  private resolveLifetimeType(category: string | undefined, role: string): string {
    if (role !== UserRole.GLOBALNETWORK) return 'lifetime';
    const normalized = (category || '').toLowerCase();
    return ['gold', 'platinum', 'diamond'].find((type) => normalized.includes(type)) || 'gold';
  }

  async getMemberAnalytics(query: MemberAnalyticsQueryDto): Promise<ISuccessResponse> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;
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
      .skip(skip)
      .limit(limit);

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
        pendingPagination: {
          page,
          limit,
          total: pendingPasswordChange,
          totalPages: Math.ceil(pendingPasswordChange / limit),
        },
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
