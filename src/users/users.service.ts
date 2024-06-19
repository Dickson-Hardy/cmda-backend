import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { User, UserDocument } from './schemas/users.schema';
// import { Model } from 'mongoose';
// import { CreateUserDto } from 'src/auth/dto/signup.dto';

@Injectable()
export class UsersService {
  // constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
  // async create(createUserDto: CreateUserDto): Promise<UserDocument> {
  //   const createdUser = new this.userModel(createUserDto);
  //   return createdUser.save();
  // }
  // async findByEmail(email: string): Promise<UserDocument> {
  //   return this.userModel.findOne({ email }).exec();
  // }
  // other methods
}
