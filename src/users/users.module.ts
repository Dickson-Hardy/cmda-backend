import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/users.schema';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { UserSettings, UserSettingsSchema } from './schema/user-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserSettings.name, schema: UserSettingsSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
