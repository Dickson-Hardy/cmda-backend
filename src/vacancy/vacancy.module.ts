import { Module } from '@nestjs/common';
import { VacancyService } from './vacancy.service';
import { VacancyController } from './vacancy.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vacancy, VacancySchema } from './vacancy.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Vacancy.name, schema: VacancySchema }])],
  controllers: [VacancyController],
  providers: [VacancyService],
})
export class VacancyModule {}
