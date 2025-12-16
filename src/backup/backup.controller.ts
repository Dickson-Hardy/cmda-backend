import { Controller, Post, Get, Delete, Param, HttpCode, HttpStatus, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminRole } from '../admin/admin.constant';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post('create')
  @Roles([AdminRole.SUPERADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a manual database backup (SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Backup created successfully and uploaded to Cloudinary' })
  @ApiResponse({ status: 500, description: 'Backup failed' })
  async createBackup() {
    const result = await this.backupService.createBackup();
    return {
      message: 'Backup created successfully and uploaded to Cloudinary',
      data: result,
    };
  }

  @Get('list')
  @Roles([AdminRole.SUPERADMIN])
  @ApiOperation({ summary: 'List all available backups (SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Returns list of backups' })
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return {
      message: 'Backups retrieved successfully',
      data: backups,
      count: backups.length,
    };
  }

  @Get('download/:filename')
  @Roles([AdminRole.SUPERADMIN])
  @ApiOperation({ summary: 'Download a specific backup file (SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Returns backup file stream' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async downloadBackup(@Param('filename') filename: string, @Res() res: Response) {
    const fileStream = await this.backupService.downloadBackup(filename);

    if (!fileStream) {
      return res.status(404).json({
        message: 'Backup not found',
        success: false,
      });
    }

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}.zip"`,
    });

    fileStream.pipe(res);
  }

  @Delete(':filename')
  @Roles([AdminRole.SUPERADMIN])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a specific backup (SuperAdmin only)' })
  @ApiResponse({ status: 200, description: 'Backup deleted successfully' })
  @ApiResponse({ status: 404, description: 'Backup not found' })
  async deleteBackup(@Param('filename') filename: string) {
    const result = await this.backupService.deleteBackup(filename);

    if (!result) {
      return {
        message: 'Backup not found',
        success: false,
      };
    }

    return {
      message: 'Backup deleted successfully',
      success: true,
    };
  }
}
