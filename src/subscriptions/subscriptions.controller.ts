import { Controller, Get, Post, Body, Req, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { ReceiptService } from './receipt.service';
import { ReceiptImageService } from './receipt-image.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { AllUserRoles } from '../users/user.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { SubscriptionPaginationQueryDto } from './dto/subscription-pagination.dto';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly receiptService: ReceiptService,
    private readonly receiptImageService: ReceiptImageService,
  ) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all subscription records -- Admin' })
  findAll(@Query() query: SubscriptionPaginationQueryDto) {
    return this.subscriptionsService.findAll(query);
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exports all subscription records' })
  exportAll(@Query() query: SubscriptionPaginationQueryDto) {
    return this.subscriptionsService.exportAll(query);
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
  init(@Req() req: { user: IJwtPayload }, @Body() subscriptionData?: any) {
    return this.subscriptionsService.init(req.user.id, subscriptionData);
  }
  @Post('save')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
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

  @Post('activate/:userId/:subDate')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a successful subscription payment details' })
  @ApiBody({ type: CreateSubscriptionDto })
  activate(@Param('userId') userId: string, @Param('subDate') subDate: string) {
    return this.subscriptionsService.activate(userId, subDate);
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

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for subscriptions' })
  getStats() {
    return this.subscriptionsService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a subscription by id' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Get(':id/receipt')
  @Roles([...AllUserRoles, ...AllAdminRoles])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download receipt for a subscription as image (PNG)' })
  async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
    try {
      const imageBuffer = await this.receiptImageService.generateReceiptImage(id);

      // Set proper headers for PNG image delivery
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="receipt-${id}.png"`);
      res.setHeader('Content-Length', imageBuffer.length.toString());
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.send(imageBuffer);
    } catch (error) {
      console.error('Receipt generation error:', error);
      res.status(error.message === 'Subscription not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to generate receipt',
      });
    }
  }
}
