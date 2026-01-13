import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ProjectDeliverablesService } from './project-deliverables.service';
import { ProjectDeliverablesExportService } from './project-deliverables-export.service';
import { CreateDeliverableDto } from './dto/create-deliverable.dto';
import { UpdateDeliverableDto } from './dto/update-deliverable.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';

@Controller('admin/project-deliverables')
@UseGuards(RolesGuard)
@Roles([AdminRole.SUPERADMIN])
export class ProjectDeliverablesController {
  constructor(
    private readonly deliverablesService: ProjectDeliverablesService,
    private readonly exportService: ProjectDeliverablesExportService,
  ) {}

  @Post()
  async create(@Body() createDto: CreateDeliverableDto) {
    const data = await this.deliverablesService.create(createDto);
    return { success: true, data, message: 'Deliverable created successfully' };
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('repository') repository?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.deliverablesService.findAll({
      status: status as any,
      category,
      repository,
      startDate,
      endDate,
    });
    return { success: true, data, message: 'Deliverables fetched successfully' };
  }

  @Get('statistics')
  async getStatistics() {
    const data = await this.deliverablesService.getStatistics();
    return { success: true, data, message: 'Statistics fetched successfully' };
  }

  @Get('timeline')
  async getTimeline() {
    const data = await this.deliverablesService.getTimeline();
    return { success: true, data, message: 'Timeline fetched successfully' };
  }

  @Get('export/pdf')
  async exportPDF(@Res() res: Response) {
    try {
      const pdfBuffer = await this.exportService.generatePDF();
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CMDA-Deliverables-${new Date().toISOString().split('T')[0]}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (error) {
      console.error('PDF Export Error:', error);
      res.status(500).json({ message: 'Failed to generate PDF', error: error.message, stack: error.stack });
    }
  }

  @Get('export/image')
  async exportImage(@Res() res: Response) {
    try {
      const imageBuffer = await this.exportService.generateImage();
      res.set({
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="CMDA-Deliverables-${new Date().toISOString().split('T')[0]}.txt"`,
        'Content-Length': imageBuffer.length,
      });
      res.send(imageBuffer);
    } catch (error) {
      console.error('Image Export Error:', error);
      res.status(500).json({ message: 'Failed to generate image', error: error.message });
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.deliverablesService.findOne(id);
    return { success: true, data, message: 'Deliverable fetched successfully' };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDeliverableDto) {
    const data = await this.deliverablesService.update(id, updateDto);
    return { success: true, data, message: 'Deliverable updated successfully' };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const data = await this.deliverablesService.remove(id);
    return { success: true, data, message: 'Deliverable deleted successfully' };
  }
}
