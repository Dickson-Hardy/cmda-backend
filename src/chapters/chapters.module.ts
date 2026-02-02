import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChaptersService } from './chapters.service';
import { ChaptersController } from './chapters.controller';
import { Chapter, ChapterSchema } from './chapters.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Chapter.name, schema: ChapterSchema }])],
  controllers: [ChaptersController],
  providers: [ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
