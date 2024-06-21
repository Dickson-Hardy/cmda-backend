import { Module } from '@nestjs/common';
import { DevotionalsService } from './devotionals.service';
import { DevotionalsController } from './devotionals.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Devotional, DevotionalSchema } from './devotional.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Devotional.name, schema: DevotionalSchema }])],
  controllers: [DevotionalsController],
  providers: [DevotionalsService],
})
export class DevotionalsModule {}
