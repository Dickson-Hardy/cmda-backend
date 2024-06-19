import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/users.schema';
import { ISuccessResponse } from '../interfaces/success-response';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: CreateUserDto): Promise<ISuccessResponse> {
    try {
      const {
        email,
        password,
        role,
        // student
        admissionYear,
        yearOfStudy,
        // doctor || globalnetwork
        licenseNumber,
        specialty,
        // globalnetwork
        country,
        ...createUserDto
      } = signUpDto;

      // check for role specific fields and throw error
      if (role === 'Student' && (!admissionYear || !yearOfStudy)) {
        throw new BadRequestException('admissionYear and yearOfStudy are compulsory for students');
      }
      if (role === 'Doctor' && (!licenseNumber || !specialty)) {
        throw new BadRequestException('licenseNumber and specialty are compulsory for doctors');
      }
      if (role === 'GlobalNetwork' && (!country || !licenseNumber || !specialty)) {
        throw new BadRequestException(
          'country, licenseNumber and specialty are compulsory for global network members',
        );
      }
      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      // create user based on role && ignore non-related fields
      const user = await this.userModel.create({
        ...createUserDto,
        email,
        password: hashedPassword,
        role,
        ...(role === 'Student' ? { admissionYear, yearOfStudy } : { licenseNumber, specialty }),
        ...(role === 'GlobalNetwork' ? { country } : {}),
      });
      // accessToken using id and email
      const accessToken = this.jwtService.sign({ id: user._id, email });
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
    const accessToken = this.jwtService.sign({ id: user._id, email });
    // return response
    return {
      success: true,
      message: 'Login successful',
      data: { user, accessToken },
    };
  }
}
