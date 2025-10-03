import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CreatePricingDto, UpdatePricingDto, PricingQueryDto } from './dto/pricing.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';

@ApiTags('Pricing Management')
@Controller('admin/pricing')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles([AdminRole.SUPERADMIN, AdminRole.FINANCE_MANAGER])
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @ApiOperation({ summary: 'Create new pricing entry' })
  @ApiResponse({ status: 201, description: 'Pricing entry created successfully' })
  create(@Body() createPricingDto: CreatePricingDto) {
    return this.pricingService.create(createPricingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all pricing entries' })
  @ApiResponse({ status: 200, description: 'Pricing entries retrieved successfully' })
  findAll(@Query() query: PricingQueryDto) {
    return this.pricingService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get pricing entry by ID' })
  @ApiResponse({ status: 200, description: 'Pricing entry retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Pricing entry not found' })
  findOne(@Param('id') id: string) {
    return this.pricingService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update pricing entry' })
  @ApiResponse({ status: 200, description: 'Pricing entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Pricing entry not found' })
  update(@Param('id') id: string, @Body() updatePricingDto: UpdatePricingDto) {
    return this.pricingService.update(id, updatePricingDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete pricing entry' })
  @ApiResponse({ status: 200, description: 'Pricing entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Pricing entry not found' })
  remove(@Param('id') id: string) {
    return this.pricingService.remove(id);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default pricing data' })
  @ApiResponse({ status: 201, description: 'Default pricing data initialized' })
  initializeDefaultPricing() {
    return this.pricingService.initializeDefaultPricing();
  }

  @Get('subscription-price')
  @ApiOperation({ summary: 'Get subscription price for user role and frequency' })
  @ApiResponse({ status: 200, description: 'Subscription price retrieved' })
  getSubscriptionPrice(
    @Query('userRole') userRole: string,
    @Query('frequency') frequency: string = 'annual',
  ) {
    return this.pricingService.getSubscriptionPrice(userRole as any, frequency as any);
  }

  @Get('income-based-price')
  @ApiOperation({ summary: 'Get income-based price' })
  @ApiResponse({ status: 200, description: 'Income-based price retrieved' })
  getIncomeBasedPrice(
    @Query('incomeBracket') incomeBracket: string,
    @Query('frequency') frequency: string,
  ) {
    return this.pricingService.getIncomeBasedPrice(incomeBracket, frequency as any);
  }

  @Get('lifetime-price')
  @ApiOperation({ summary: 'Get lifetime membership price' })
  @ApiResponse({ status: 200, description: 'Lifetime price retrieved' })
  getLifetimePrice(@Query('membershipType') membershipType: string) {
    return this.pricingService.getLifetimePrice(membershipType);
  }
}
