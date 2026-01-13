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
import { ServiceSubscriptionsService } from './service-subscriptions.service';
import {
  CreateServiceSubscriptionDto,
  RenewServiceDto,
} from './dto/create-service-subscription.dto';
import { UpdateServiceSubscriptionDto } from './dto/update-service-subscription.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';

@Controller('admin/service-subscriptions')
@UseGuards(RolesGuard)
@Roles([AdminRole.SUPERADMIN])
export class ServiceSubscriptionsController {
  constructor(private readonly subscriptionsService: ServiceSubscriptionsService) {}

  @Post()
  create(@Body() createDto: CreateServiceSubscriptionDto) {
    return this.subscriptionsService.create(createDto);
  }

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('provider') provider?: string,
    @Query('search') search?: string,
    @Query('expiringSoon') expiringSoon?: string,
  ) {
    return this.subscriptionsService.findAll({
      status: status as any,
      category,
      provider,
      search,
      expiringSoon: expiringSoon === 'true',
    });
  }

  @Get('statistics')
  getStatistics() {
    return this.subscriptionsService.getStatistics();
  }

  @Get('annual-report')
  getAnnualReport(@Query('year') year?: string) {
    return this.subscriptionsService.getAnnualReport(
      year ? parseInt(year) : new Date().getFullYear(),
    );
  }

  @Get('export/spending-report')
  async exportSpendingReport(@Res() res: Response, @Query('year') year?: string) {
    const reportYear = year ? parseInt(year) : new Date().getFullYear();
    const report = await this.subscriptionsService.generateSpendingReport(reportYear);

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="subscription-report-${reportYear}.json"`,
    });
    res.send(report);
  }

  @Get('expiring-preview')
  getExpiringServicesPreview(@Query('days') days?: string) {
    const daysAhead = days ? parseInt(days) : 30;
    return this.subscriptionsService.getExpiringServicesPreview(daysAhead);
  }

  @Get('expiring-invoice')
  async downloadExpiringServicesInvoice(@Res() res: Response, @Query('days') days?: string) {
    const daysAhead = days ? parseInt(days) : 30;
    const pdfBuffer = await this.subscriptionsService.generateExpiringServicesInvoicePdf(daysAhead);

    const now = new Date();
    const invoiceNumber = `INV-SVC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  }

  @Post('send-expiring-invoice')
  sendExpiringServicesInvoice(
    @Body() body: { email?: string; days?: number },
  ) {
    return this.subscriptionsService.sendExpiringServicesInvoice(body.email, body.days || 30);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateServiceSubscriptionDto) {
    return this.subscriptionsService.update(id, updateDto);
  }

  @Post(':id/renew')
  renewService(@Param('id') id: string, @Body() renewDto: RenewServiceDto) {
    return this.subscriptionsService.renewService(id, renewDto);
  }

  @Post(':id/quick-renew')
  quickRenewService(@Param('id') id: string) {
    return this.subscriptionsService.quickRenewService(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }

  @Post('update-statuses')
  updateStatuses() {
    return this.subscriptionsService.updateStatuses();
  }

  @Post('send-reminders')
  sendReminders() {
    return this.subscriptionsService.sendRenewalReminders();
  }
}
