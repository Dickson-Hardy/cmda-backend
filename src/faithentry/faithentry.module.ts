import { Module } from '@nestjs/common';
import { FaithEntryService } from './faithentry.service';
import { FaithEntryController } from './faithentry.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FaithEntry, FaithEntrySchema } from './faithentry.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: FaithEntry.name, schema: FaithEntrySchema }])],
  controllers: [FaithEntryController],
  providers: [FaithEntryService],
})
export class FaithEntryModule {}
