import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DevotionalsService } from './devotionals.service';
import { CreateDevotionalDto } from './dto/create-devotional.dto';
import { UpdateDevotionalDto } from './dto/update-devotional.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllAdminRoles } from '../admin/admin.constant';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Devotionals')
@Controller('devotionals')
export class DevotionalsController {
  constructor(private readonly devotionalsService: DevotionalsService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a daily devotional' })
  @ApiBody({ type: CreateDevotionalDto })
  create(@Body() createDevotionalDto: CreateDevotionalDto) {
    return this.devotionalsService.create(createDevotionalDto);
  }

  @Get()
  @ApiOperation({ summary: 'Fetches all daily devotionals' })
  @Public()
  findAll() {
    return this.devotionalsService.findAll();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Fetch a daily devotional by id' })
  findOne(@Param('id') id: string) {
    return this.devotionalsService.findOne(id);
  }

  @Patch(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a daily devotional by id' })
  update(@Param('id') id: string, @Body() updateDevotionalDto: UpdateDevotionalDto) {
    return this.devotionalsService.update(id, updateDevotionalDto);
  }

  @Delete(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a daily devotional by id' })
  remove(@Param('id') id: string) {
    return this.devotionalsService.remove(id);
  }
}
