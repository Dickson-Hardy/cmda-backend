import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './events.schema';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    CloudinaryModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
