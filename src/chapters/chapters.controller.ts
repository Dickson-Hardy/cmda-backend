import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ChaptersService } from './chapters.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { AllAdminRoles } from '../admin/admin.constant';
import { ChapterType } from './chapters.schema';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Chapters')
@Controller('chapters')
export class ChaptersController {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Post()
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new chapter' })
  create(@Body() createChapterDto: CreateChapterDto) {
    return this.chaptersService.create(createChapterDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all chapters' })
  @ApiQuery({ name: 'type', enum: ChapterType, required: false })
  findAll(@Query('type') type?: ChapterType) {
    return this.chaptersService.findAll(type);
  }

  @Get('stats')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chapter statistics' })
  getStats() {
    return this.chaptersService.getStats();
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a chapter by ID' })
  findOne(@Param('id') id: string) {
    return this.chaptersService.findOne(id);
  }

  @Patch(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a chapter' })
  update(@Param('id') id: string, @Body() updateChapterDto: UpdateChapterDto) {
    return this.chaptersService.update(id, updateChapterDto);
  }

  @Delete(':id')
  @Roles(AllAdminRoles)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a chapter' })
  remove(@Param('id') id: string) {
    return this.chaptersService.remove(id);
  }
}
