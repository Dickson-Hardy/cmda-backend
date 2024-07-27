import {
  BadRequestException,
  ConflictException,
  Injectable,
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

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<Admin>,
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

    const admin = await this.adminModel.findOne({ email });
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
}
