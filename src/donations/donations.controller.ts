import { Controller, Get, Post, Body, Req, Query, Param } from '@nestjs/common';
import { DonationsService } from './donations.service';
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
  constructor(private readonly donationsService: DonationsService) {}

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
}
