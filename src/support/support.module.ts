import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from '../email/email.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { SupportTicket, SupportTicketSchema } from './support.schema';
import { SupportService } from './support.service';
import { SupportController } from './support.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SupportTicket.name, schema: SupportTicketSchema }]),
    EmailModule,
    CloudinaryModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
