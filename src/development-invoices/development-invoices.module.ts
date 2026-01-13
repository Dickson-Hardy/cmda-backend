import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DevelopmentInvoicesController } from './development-invoices.controller';
import { DevelopmentInvoicesService } from './development-invoices.service';
import { DevelopmentInvoice, DevelopmentInvoiceSchema } from './development-invoices.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DevelopmentInvoice.name, schema: DevelopmentInvoiceSchema },
    ]),
  ],
  controllers: [DevelopmentInvoicesController],
  providers: [DevelopmentInvoicesService],
  exports: [DevelopmentInvoicesService],
})
export class DevelopmentInvoicesModule {}
