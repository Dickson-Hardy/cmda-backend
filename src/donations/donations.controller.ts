import { Controller, Get, Post, Body, Req, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { DonationsService } from './donations.service';
import { DonationReceiptService } from './receipt.service';
import { DonationReceiptImageService } from './donation-receipt-image.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IJwtPayload } from '../_global/interface/jwt-payload';
import { InitDonationDto } from './dto/init-donation.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { AllUserRoles } from '../users/user.constant';
import { DonationPaginationQueryDto } from './dto/donation-pagination.dto';

@ApiTags('Donations')
@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly donationReceiptService: DonationReceiptService,
    private readonly donationReceiptImageService: DonationReceiptImageService,
  ) {}

  @Get()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all donations -- Admin' })
  findAll(@Query() query: DonationPaginationQueryDto) {
    return this.donationsService.findAll(query);
  }

  @Get('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exports all donation records' })
  exportAll(@Query() query: DonationPaginationQueryDto) {
    return this.donationsService.exportAll(query);
  }

  @Get('user')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Fetch current user's donations" })
  findUserDonations(@Req() req: { user: IJwtPayload }, @Query() query: PaginationQueryDto) {
    return this.donationsService.findUserDonations(req.user.id, query);
  }

  @Post('init')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Init a donation payment session' })
  @ApiBody({ type: InitDonationDto })
  init(@Req() req: { user: IJwtPayload }, @Body() initDonationDto: InitDonationDto) {
    return this.donationsService.init(req.user.id, initDonationDto);
  }
  @Post('create')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'saves a donation after successful payment session' })
  @ApiBody({ type: CreateDonationDto })
  create(@Body() createDonationDto: CreateDonationDto) {
    return this.donationsService.create(createDonationDto);
  }

  @Post('sync-payment-status')
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually sync donation payment status with payment provider' })
  syncPaymentStatus(
    @Req() req: { user: IJwtPayload },
    @Body() { reference }: { reference: string },
  ) {
    return this.donationsService.syncPaymentStatus(req.user.id, reference);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for donations' })
  getStats() {
    return this.donationsService.getStats();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a donation by id' })
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }

  @Get(':id/receipt')
  @Roles([...AllUserRoles, ...AllAdminRoles])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download receipt for a donation as image (PNG)' })
  async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
    try {
      const imageBuffer = await this.donationReceiptImageService.generateReceiptImage(id);

      // Set proper headers for PNG image delivery
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="donation-receipt-${id}.png"`);
      res.setHeader('Content-Length', imageBuffer.length.toString());
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.send(imageBuffer);
    } catch (error) {
      console.error('Donation receipt error:', error);
      res.status(error.message === 'Donation not found' ? 404 : 500).json({
        success: false,
        message: error.message || 'Failed to generate receipt',
      });
    }
  }
}
