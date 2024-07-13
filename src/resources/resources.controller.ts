import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { CreateResourceFromUrlDto } from './dto/create-resource-from-url.dto';
import { ResourcePaginationQueryDto } from './dto/resource-pagination-query-dto';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all resources' })
  findAll(@Query() query: ResourcePaginationQueryDto) {
    return this.resourcesService.findAll(query);
  }

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a resource from wordpress or youtube url' })
  @ApiBody({ type: CreateResourceFromUrlDto })
  createFromUrl(@Body() createResourceFromUrlDto: CreateResourceFromUrlDto) {
    return this.resourcesService.createFromUrl(createResourceFromUrlDto);
  }

  @Get('stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Returns total count for each resource category' })
  getStats() {
    return this.resourcesService.getStats();
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a resource by slug' })
  findOne(@Param('slug') slug: string) {
    return this.resourcesService.findOne(slug);
  }

  @Patch(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a resource by slug - to match current wordpress or youtube content',
  })
  updateOne(@Param('slug') slug: string) {
    return this.resourcesService.updateOne(slug);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a resource by its slug' })
  removeOne(@Param('slug') slug: string) {
    return this.resourcesService.removeOne(slug);
  }
}
