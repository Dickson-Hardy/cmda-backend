import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './events.schema';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PaystackModule } from '../paystack/paystack.module';
import { User, UserSchema } from '../users/schema/users.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CloudinaryModule,
    PaystackModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
