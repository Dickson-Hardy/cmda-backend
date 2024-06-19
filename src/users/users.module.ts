import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
// import { MongooseModule } from '@nestjs/mongoose';
// import { User, UserSchema } from './schemas/users.schema';
// import { StudentSchema } from './schemas/student.schema';
// import { DoctorSchema } from './schemas/doctor.schema';
// import { GlobalNetworkSchema } from './schemas/globalnetwork.schema';

@Module({
  imports: [
    // MongooseModule.forFeature([
    //   {
    //     name: User.name,
    //     schema: UserSchema,
    //     discriminators: [
    //       { name: 'Student', schema: StudentSchema },
    //       { name: 'Doctor', schema: DoctorSchema },
    //       { name: 'GlobalNetwork', schema: GlobalNetworkSchema },
    //     ],
    //   },
    // ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
