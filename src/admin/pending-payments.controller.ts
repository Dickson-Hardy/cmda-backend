import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from './admin.constant';
import { PendingPaymentsService } from './pending-payments.service';
import { RefreshPendingPaymentDto } from './dto/refresh-pending-payment.dto';

@ApiTags('Admin - Pending Payments')
@Controller('admin/pending-payments')
@ApiBearerAuth()
export class PendingPaymentsController {
  constructor(private pendingPaymentsService: PendingPaymentsService) {}

  @Get()
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get all pending payments and registrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchBy', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: ['events', 'subscriptions', 'donations'] })
  async getPendingRegistrations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchBy') searchBy?: string,
    @Query('type') type?: 'events' | 'subscriptions' | 'donations',
  ) {
    return this.pendingPaymentsService.getPendingRegistrations({
      page,
      limit,
      searchBy,
      type,
    });
  }

  @Get('stats')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get pending payments statistics' })
  async getPendingRegistrationStats() {
    return this.pendingPaymentsService.getPendingRegistrationStats();
  }

  @Post('refresh')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Refresh pending payment status from payment gateway' })
  async refreshPendingPayment(@Body() refreshDto: RefreshPendingPaymentDto) {
    return this.pendingPaymentsService.refreshPendingPayment(refreshDto);
  }
  @Get('events')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get pending event registrations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchBy', required: false, type: String })
  @ApiQuery({ name: 'eventSlug', required: false, type: String })
  async getPendingEventRegistrations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchBy') searchBy?: string,
    @Query('eventSlug') eventSlug?: string,
  ) {
    return this.pendingPaymentsService.getPendingEventRegistrations({
      page,
      limit,
      searchBy,
      eventSlug,
    });
  }

  @Get('subscriptions')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get pending subscription payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchBy', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'region', required: false, type: String })
  async getPendingSubscriptionPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchBy') searchBy?: string,
    @Query('role') role?: string,
    @Query('region') region?: string,
  ) {
    return this.pendingPaymentsService.getPendingSubscriptionPayments({
      page,
      limit,
      searchBy,
      role,
      region,
    });
  }

  @Get('donations')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get pending donation payments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchBy', required: false, type: String })
  @ApiQuery({ name: 'areasOfNeed', required: false, type: String })
  async getPendingDonationPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('searchBy') searchBy?: string,
    @Query('areasOfNeed') areasOfNeed?: string,
  ) {
    return this.pendingPaymentsService.getPendingDonationPayments({
      page,
      limit,
      searchBy,
      areasOfNeed,
    });
  }

  @Post('confirm')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Manually confirm a payment' })
  async manuallyConfirmPayment(
    @Body()
    confirmData: {
      reference: string;
      type: 'events' | 'subscriptions' | 'donations';
      confirmationData: any;
    },
  ) {
    return this.pendingPaymentsService.manuallyConfirmPayment(confirmData);
  }

  @Get('verify/:reference')
  @Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
  @ApiOperation({ summary: 'Get payment verification details from gateway' })
  @ApiQuery({ name: 'source', required: true, type: String })
  async getPaymentVerificationDetails(
    @Param('reference') reference: string,
    @Query('source') source: string,
  ) {
    return this.pendingPaymentsService.getPaymentVerificationDetails(reference, source);
  }
}
