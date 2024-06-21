import { Controller, Get, Post, Body, Patch, Param, Delete, Req, Query } from '@nestjs/common';
import { FaithEntryService } from './faithentry.service';
import { CreateFaithEntryDto } from './dto/create-faithentry.dto';
import { UpdateFaithEntryDto } from './dto/update-faithentry.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { AllUserRoles } from '../users/user.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { IJwtPayload } from '../_global/interface/jwt-payload';

@ApiTags('FaithEntry')
@Controller('faith-entry')
export class FaithEntryController {
  constructor(private readonly faithEntryService: FaithEntryService) {}

  @Post()
  @Roles(AllUserRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a testimony or prayer request' })
  @ApiBody({ type: CreateFaithEntryDto })
  create(@Req() req: { user: IJwtPayload }, @Body() createFaithentryDto: CreateFaithEntryDto) {
    return this.faithEntryService.create(req.user.id, createFaithentryDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns all testimonies and prayer requests' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.faithEntryService.findAll(query);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gets a testimony or prayer request  by id' })
  findOne(@Param('id') id: string) {
    return this.faithEntryService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Updates a testimony or prayer request  by id' })
  update(@Param('id') id: string, @Body() updateFaithentryDto: UpdateFaithEntryDto) {
    return this.faithEntryService.update(id, updateFaithentryDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(AllAdminRoles)
  @ApiOperation({ summary: 'Deletes a testimony or prayer request  by id' })
  remove(@Param('id') id: string) {
    return this.faithEntryService.remove(id);
  }
}
