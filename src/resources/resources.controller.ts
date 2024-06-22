import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { CreateResourceFromUrlDto } from './dto/create-resource-from-url.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Fetch all resources' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.resourcesService.findAll(query);
  }

  // @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  // @ApiOperation({ summary: 'Create a resource' })
  // @ApiBody({ type: CreateResourceDto })
  create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(createResourceDto);
  }

  @Post('create-from-url')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @Public()
  @ApiOperation({ summary: 'Create a resource from wordpress or youtube url' })
  @ApiBody({ type: CreateResourceFromUrlDto })
  createFromUrl(@Body() createResourceFromUrlDto: CreateResourceFromUrlDto) {
    return this.resourcesService.createFromUrl(createResourceFromUrlDto);
  }

  @Get(':slug')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a resource by slug' })
  findOne(@Param('slug') slug: string) {
    return this.resourcesService.findOne(slug);
  }

  // @Patch(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a resource by slug' })
  updateOne(@Param('slug') slug: string, @Body() updateResourceDto) {
    return this.resourcesService.updateOne(slug, updateResourceDto);
  }

  @Delete(':slug')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a resource by its slug' })
  removeOne(@Param('slug') slug: string) {
    return this.resourcesService.removeOne(slug);
  }
}
