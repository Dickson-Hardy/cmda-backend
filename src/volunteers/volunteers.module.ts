import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VolunteersService } from './volunteers.service';
import { VolunteersController } from './volunteers.controller';
import { VolunteerJob, VolunteerJobSchema } from './volunteer-job.schema';
import { VolunteerShift, VolunteerShiftSchema } from './volunteer-shift.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VolunteerJob.name, schema: VolunteerJobSchema },
      { name: VolunteerShift.name, schema: VolunteerShiftSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService],
})
export class VolunteersModule {}
