import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { PaginationQueryDto } from '../_global/dto/pagination-query.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';

@ApiTags('Resources')
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a resource' })
  @ApiBody({ type: CreateResourceDto })
  create(@Body() createResourceDto: CreateResourceDto) {
    return this.resourcesService.create(createResourceDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch all resources' })
  findAll(@Query() query: PaginationQueryDto) {
    return this.resourcesService.findAll(query);
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
