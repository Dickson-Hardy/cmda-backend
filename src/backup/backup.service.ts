import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import * as archiver from 'archiver';
import * as https from 'https';
import { Readable } from 'stream';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly mongoUri: string;
  private backupsMetadata: Array<{
    filename: string;
    date: Date;
    size: string;
    cloudinaryId: string;
    cloudinaryUrl: string;
  }> = [];

  constructor(
    private readonly configService: ConfigService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.mongoUri = this.configService.get<string>('MONGODB_URI');
    this.backupDir = path.join(process.cwd(), 'backups');

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Load backups metadata from Cloudinary on startup
    this.loadBackupsFromCloudinary();
  }

  /**
   * Load backups metadata from Cloudinary
   */
  private async loadBackupsFromCloudinary() {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'cmda-backups/',
        resource_type: 'raw',
        max_results: 500,
      });

      this.backupsMetadata = result.resources.map((resource: any) => ({
        filename: resource.public_id.replace('cmda-backups/', ''),
        date: new Date(resource.created_at),
        size: `${(resource.bytes / (1024 * 1024)).toFixed(2)}MB`,
        cloudinaryId: resource.public_id,
        cloudinaryUrl: resource.secure_url,
      }));

      this.logger.log(`Loaded ${this.backupsMetadata.length} backup(s) from Cloudinary`);
    } catch (error) {
      this.logger.error(`Failed to load backups from Cloudinary: ${error.message}`);
      this.backupsMetadata = [];
    }
  }

  /**
   * Create a manual database backup
   */
  async createBackup(): Promise<{
    success: boolean;
    filename: string;
    cloudinaryUrl: string;
    size: string;
  }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cmda-backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, filename);
    const zipPath = `${backupPath}.zip`;

    try {
      this.logger.log(`Starting database backup: ${filename}`);

      // Create backup directory
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Export all collections using Mongoose
      await this.exportCollections(backupPath);

      // Create zip archive
      await this.createZipArchive(backupPath, zipPath);

      // Get file size
      const stats = fs.statSync(zipPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      this.logger.log(`Backup compressed: ${filename}.zip (${sizeInMB}MB)`);

      // Upload to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(zipPath, {
        resource_type: 'raw',
        folder: 'cmda-backups',
        public_id: filename,
        tags: ['database-backup'],
      });

      this.logger.log(`Backup uploaded to Cloudinary: ${uploadResult.secure_url}`);

      // Add to metadata
      this.backupsMetadata.unshift({
        filename,
        date: new Date(),
        size: `${sizeInMB}MB`,
        cloudinaryId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
      });

      // Clean up local files
      fs.rmSync(backupPath, { recursive: true, force: true });
      fs.unlinkSync(zipPath);

      // Clean up old backups (keep last 10)
      await this.cleanupOldBackups();

      return {
        success: true,
        filename,
        cloudinaryUrl: uploadResult.secure_url,
        size: `${sizeInMB}MB`,
      };
    } catch (error) {
      this.logger.error(`Backup failed: ${error.message}`, error.stack);

      // Clean up local files on error
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      throw new InternalServerErrorException(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Export all collections to JSON files
   */
  private async exportCollections(backupPath: string): Promise<void> {
    const collections = await this.connection.db.listCollections().toArray();

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = this.connection.db.collection(collectionName);

      // Get all documents
      const documents = await collection.find({}).toArray();

      // Write to JSON file
      const filePath = path.join(backupPath, `${collectionName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));

      this.logger.log(`Exported ${documents.length} documents from ${collectionName}`);
    }
  }

  /**
   * Create a zip archive from a directory
   */
  private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => resolve());
      archive.on('error', (err) => reject(err));

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  /**
   * Scheduled biweekly backup (runs every 2 weeks on Sunday at 2 AM)
   */
  @Cron('0 2 * * 0', {
    name: 'biweekly-backup',
  })
  async scheduledBiweeklyBackup() {
    // Check if it's a biweekly occurrence (every 2 weeks)
    const weekNumber = this.getWeekNumber(new Date());
    if (weekNumber % 2 === 0) {
      this.logger.log('Running scheduled biweekly backup');
      try {
        const result = await this.createBackup();
        this.logger.log(`Scheduled backup completed: ${result.filename}`);
      } catch (error) {
        this.logger.error('Scheduled backup failed', error.stack);
      }
    }
  }

  /**
   * Get list of all backups
   */
  async listBackups(): Promise<
    Array<{
      filename: string;
      date: Date;
      size: string;
      cloudinaryUrl?: string;
    }>
  > {
    try {
      // Refresh metadata from Cloudinary
      await this.loadBackupsFromCloudinary();

      // Sort by date, newest first
      return this.backupsMetadata
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ filename, date, size, cloudinaryUrl }) => ({
          filename,
          date,
          size,
          cloudinaryUrl,
        }));
    } catch (error) {
      this.logger.error(`Failed to list backups: ${error.message}`);
      return [];
    }
  }

  /**
   * Download a backup file from Cloudinary
   */
  async downloadBackup(filename: string): Promise<Readable | null> {
    try {
      // Find backup in metadata
      const backup = this.backupsMetadata.find((b) => b.filename === filename);

      if (!backup) {
        return null;
      }

      // Generate a signed URL with 1 hour expiration
      const signedUrl = cloudinary.url(backup.cloudinaryId, {
        resource_type: 'raw',
        sign_url: true,
        secure: true,
        type: 'upload',
      });

      // Fetch and stream the file
      return await this.streamFromUrl(signedUrl);
    } catch (error) {
      this.logger.error(`Failed to download backup: ${error.message}`);
      return null;
    }
  }

  /**
   * Stream a file from a URL
   */
  private async streamFromUrl(url: string): Promise<Readable> {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode === 200) {
          resolve(response);
        } else {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
        }
      }).on('error', reject);
    });
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(filename: string): Promise<boolean> {
    try {
      // Find backup in metadata
      const backup = this.backupsMetadata.find((b) => b.filename === filename);

      if (!backup) {
        return false;
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(backup.cloudinaryId, { resource_type: 'raw' });

      // Remove from metadata
      this.backupsMetadata = this.backupsMetadata.filter((b) => b.filename !== filename);

      this.logger.log(`Backup deleted from Cloudinary: ${filename}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete backup: ${error.message}`);
      throw new InternalServerErrorException(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Clean up old backups, keeping only the last 10
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      // Sort backups by date
      const sortedBackups = [...this.backupsMetadata].sort(
        (a, b) => b.date.getTime() - a.date.getTime(),
      );

      if (sortedBackups.length > 10) {
        const backupsToDelete = sortedBackups.slice(10);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.filename);
        }

        this.logger.log(`Cleaned up ${backupsToDelete.length} old backup(s) from Cloudinary`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old backups: ${error.message}`);
    }
  }

  /**
   * Get week number of the year
   */
  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
}
