import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { DevelopmentInvoicesService } from './development-invoices.service';
import { CreateInvoiceDto, RecordPaymentDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';

@Controller('admin/development-invoices')
@UseGuards(RolesGuard)
@Roles([AdminRole.SUPERADMIN])
export class DevelopmentInvoicesController {
  constructor(private readonly invoicesService: DevelopmentInvoicesService) {}

  @Post()
  create(@Body() createDto: CreateInvoiceDto) {
    return this.invoicesService.create(createDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.invoicesService.findAll({
      status: status as any,
      startDate,
      endDate,
    });
  }

  @Get('statistics')
  getStatistics() {
    return this.invoicesService.getStatistics();
  }

  @Get('generate-number')
  generateInvoiceNumber() {
    return this.invoicesService.generateInvoiceNumber();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, updateDto);
  }

  @Post(':id/payment')
  recordPayment(@Param('id') id: string, @Body() paymentDto: RecordPaymentDto) {
    return this.invoicesService.recordPayment(id, paymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }

  @Get(':id/export/pdf')
  async exportInvoicePDF(@Param('id') id: string, @Res() res: Response) {
    // TODO: Implement PDF export
    res.status(501).json({ message: 'PDF export coming soon' });
  }
}
