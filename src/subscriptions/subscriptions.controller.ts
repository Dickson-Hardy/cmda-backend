import { Controller, Get, Post, Body, Req, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { ReceiptService } from './receipt.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { InitSubscriptionDto } from './dto/init-subscription.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AllUserRoles } from '../users/user.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { SubscriptionPaginationQueryDto } from './dto/subscription-pagination.dto';
import { ParseObjectIdPipe } from '../_global/pipes/parse-object-id.pipe';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly receiptService: ReceiptService,
    private readonly receiptPdfService: ReceiptPdfService,
  ) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all subscription records -- Admin' })
  findAll(@Query() query: SubscriptionPaginationQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get('export')
  @Roles([...AllUserRoles, ...AllAdminRoles])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exports all subscription records' })
  exportAll(@Req() req: { user: IJwtPayload }, @Query() query: SubscriptionPaginationQueryDto) {
    const isAdmin = AllAdminRoles.map(String).includes(req.user.role);
    return this.subscriptionsService.exportAll({
      ...query,
      userId: isAdmin ? query.userId : req.user.id,
    });
  }

  @Get('history')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's subscription history" })
  findUserSubs(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    return this.subscriptionsService.findUserSubs(req.user.id, query);
  }
  @Post('pay')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'init a subscription payment session' })
  init(@Req() req: { user: IJwtPayload }, @Body() subscriptionData?: InitSubscriptionDto) {
    return this.subscriptionsService.init(req.user.id, subscriptionData);
  }
  @Post('save')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  create(@Req() req: { user: IJwtPayload }, @Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(req.user.id, createSubscriptionDto);
  }

  @Post('sync-payment-status')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually sync subscription payment status with payment provider' })
  syncPaymentStatus(
    @Req() req: { user: IJwtPayload },
    @Body() { reference }: { reference: string },
  ) {
    return this.subscriptionsService.syncPaymentStatus(req.user.id, reference);
  }

  @Post('activate/:userId/:subYear')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  activate(@Param('userId') userId: string, @Param('subYear') subYear: string) {
    return this.subscriptionsService.activate(userId, subYear);
  }

  @Post('activate-lifetime/:userId')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate lifetime membership for a user (Admin only)' })
  activateLifetime(
    @Param('userId') userId: string,
    @Body() body: { isNigerian?: boolean; lifetimeType?: string },
  ) {
    return this.subscriptionsService.activateLifetime(userId, body.isNigerian, body.lifetimeType);
  }

  @Post('cancel')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel current user subscription' })
  cancelSubscription(@Req() req: { user: IJwtPayload }) {
    return this.subscriptionsService.cancelSubscription(req.user.id);
  }

  @Post('renew')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renew current user subscription' })
  renewSubscription(@Req() req: { user: IJwtPayload }) {
    return this.subscriptionsService.renewSubscription(req.user.id);
  }

  @Get('status')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user subscription status' })
  getSubscriptionStatus(@Req() req: { user: IJwtPayload }) {
    return this.subscriptionsService.getSubscriptionStatus(req.user.id);
  }

  @Get('stats')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for subscriptions' })
  getStats() {
    return this.subscriptionsService.getStats();
  }

  @Get(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subscription by id' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Get(':id/receipt')
  @Roles([...AllUserRoles, ...AllAdminRoles])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download receipt for a subscription as PDF' })
  async downloadReceipt(
    @Req() req: { user: IJwtPayload },
    @Param('id', ParseObjectIdPipe) id: string,
    @Res() res: Response,
  ) {
    const isAdmin = AllAdminRoles.map(String).includes(req.user.role);
    await this.subscriptionsService.assertCanDownloadReceipt(id, req.user.id, isAdmin);
    const pdfBuffer = await this.receiptPdfService.generateReceiptPdf(id);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.send(pdfBuffer);
  }
}
