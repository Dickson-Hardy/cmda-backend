import { Injectable, Logger } from '@nestjs/common';
import { ProjectDeliverablesService } from './project-deliverables.service';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ProjectDeliverablesExportService {
  private readonly logger = new Logger(ProjectDeliverablesExportService.name);

  constructor(private readonly deliverablesService: ProjectDeliverablesService) {}

  async generatePDF(): Promise<Buffer> {
    const deliverables = await this.deliverablesService.findAll();
    const stats = await this.deliverablesService.getStatistics();

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const margin = 50;
        const purple = '#6f1d46';
        const green = '#009246';

        // ===== TOP PURPLE BAR =====
        doc.rect(0, 0, pageWidth, 18).fill(purple);

        // ===== HEADER =====
        let y = 40;

        // Title
        doc.fillColor('#000000');
        doc.fontSize(24).font('Helvetica-Bold').text('PROJECT DELIVERABLES REPORT', margin, y);

        // Organization info (right side)
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text('CHRISTIAN MEDICAL\nAND DENTAL ASSOCIATION\nOF NIGERIA', pageWidth - 220, y, {
          width: 170,
          align: 'right',
        });
        doc.fontSize(7).text('(CMDA NIGERIA)', pageWidth - 220, y + 35, {
          width: 170,
          align: 'right',
        });

        // ===== REPORT DETAILS =====
        y = 100;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');

        // Report Date
        doc.text('Report Date:', margin, y);
        doc.font('Helvetica').text(
          new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          margin + 90,
          y,
        );

        y += 20;
        // Total Items
        doc.font('Helvetica-Bold').text('Total Items:', margin, y);
        doc.font('Helvetica').text(String(stats.total || 0), margin + 90, y);

        y += 20;
        // Status
        doc.font('Helvetica-Bold').text('Status:', margin, y);
        doc.font('Helvetica').fillColor(green).text('Production Ready', margin + 90, y);

        // ===== STATISTICS BOX =====
        const statsBoxX = pageWidth - 250;
        const statsBoxY = 100;
        const statsBoxWidth = 200;
        const statsBoxHeight = 100;

        doc.rect(statsBoxX, statsBoxY, statsBoxWidth, statsBoxHeight).stroke('#cccccc');
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
        doc.text('SUMMARY STATISTICS', statsBoxX + 10, statsBoxY + 10);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Completed: ${stats.completed || 0}`, statsBoxX + 10, statsBoxY + 30);
        doc.text(`In Progress: ${stats.inProgress || 0}`, statsBoxX + 10, statsBoxY + 44);
        doc.text(`Pending: ${stats.pending || 0}`, statsBoxX + 10, statsBoxY + 58);
        doc.text(`Total Hours: ${(stats.totalHoursActual || 0).toLocaleString()}`, statsBoxX + 10, statsBoxY + 72);
        doc.text(`Lines of Code: ${(stats.totalLinesOfCode || 0).toLocaleString()}`, statsBoxX + 10, statsBoxY + 86);

        // ===== DELIVERABLES TABLE =====
        y = 220;
        const tableLeft = margin;
        const tableWidth = pageWidth - margin * 2;
        const colWidths = [180, 80, 80, 70, 85]; // Title, Category, Status, Hours, Completed
        const rowHeight = 28;

        // Table header
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(green);
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

        let colX = tableLeft + 8;
        doc.text('Title', colX, y + 9);
        colX += colWidths[0];
        doc.text('Category', colX, y + 9);
        colX += colWidths[1];
        doc.text('Status', colX, y + 9);
        colX += colWidths[2];
        doc.text('Hours', colX, y + 9);
        colX += colWidths[3];
        doc.text('Completed', colX, y + 9);

        // Table rows
        y += rowHeight;
        doc.fillColor('#000000').font('Helvetica').fontSize(8);

        for (const item of deliverables) {
          // Alternate row background
          const rowIndex = deliverables.indexOf(item);
          if (rowIndex % 2 === 0) {
            doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#f9f9f9');
          }

          // Draw row borders
          doc.rect(tableLeft, y, tableWidth, rowHeight).stroke('#e0e0e0');

          // Row content
          doc.fillColor('#000000');
          colX = tableLeft + 8;

          // Title (truncate if too long)
          const title = item.title.length > 30 ? item.title.substring(0, 27) + '...' : item.title;
          doc.text(title, colX, y + 9, { width: colWidths[0] - 10 });
          colX += colWidths[0];

          // Category
          const category = (item.category || 'other').replace(/_/g, ' ');
          doc.text(category.charAt(0).toUpperCase() + category.slice(1), colX, y + 9, {
            width: colWidths[1] - 10,
          });
          colX += colWidths[1];

          // Status with color
          const status = (item.status || 'pending').replace(/_/g, ' ');
          const statusColor = item.status === 'completed' ? green : item.status === 'in_progress' ? '#2563eb' : '#f59e0b';
          doc.fillColor(statusColor);
          doc.text(status.charAt(0).toUpperCase() + status.slice(1), colX, y + 9, {
            width: colWidths[2] - 10,
          });
          colX += colWidths[2];

          // Hours
          doc.fillColor('#000000');
          doc.text(`${item.actualTime || item.estimatedTime || 0}h`, colX, y + 9, {
            width: colWidths[3] - 10,
          });
          colX += colWidths[3];

          // Completion date
          const completedDate = item.completionDate
            ? new Date(item.completionDate).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '-';
          doc.text(completedDate, colX, y + 9, { width: colWidths[4] - 10 });

          y += rowHeight;

          // Check if we need a new page
          if (y > doc.page.height - 150) {
            doc.addPage();
            // Add header bar on new page
            doc.rect(0, 0, pageWidth, 18).fill(purple);
            y = 50;
          }
        }

        // ===== BREAKDOWN BY CATEGORY =====
        y += 30;
        if (y > doc.page.height - 200) {
          doc.addPage();
          doc.rect(0, 0, pageWidth, 18).fill(purple);
          y = 50;
        }

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
        doc.text('BREAKDOWN BY CATEGORY', margin, y);

        y += 20;
        doc.fontSize(9).font('Helvetica');

        Object.entries(stats.byCategory || {}).forEach(([cat, data]: [string, any]) => {
          const catLabel = cat.replace(/_/g, ' ').toUpperCase();
          doc.text(`${catLabel}: ${data.count} items (${data.hours} hours)`, margin, y);
          y += 14;
        });

        // ===== BREAKDOWN BY REPOSITORY =====
        y += 20;
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
        doc.text('BREAKDOWN BY REPOSITORY', margin, y);

        y += 20;
        doc.fontSize(9).font('Helvetica');

        Object.entries(stats.byRepository || {}).forEach(([repo, data]: [string, any]) => {
          const repoLabel = repo.toUpperCase();
          doc.text(
            `${repoLabel}: ${data.count} items | ${data.hours} hours | ${(data.linesOfCode || 0).toLocaleString()} LOC`,
            margin,
            y,
          );
          y += 14;
        });

        // ===== FOOTER =====
        const footerY = doc.page.height - 80;

        doc.fontSize(9).font('Helvetica').fillColor('#666666');
        doc.text('CMDA Nigeria - Wholeness House Gwagwalada, FCT, Nigeria', margin, footerY, {
          align: 'center',
          width: pageWidth - margin * 2,
        });
        doc.text('Email: office@cmdanigeria.org | Phone: +234 803 304 3290', margin, footerY + 14, {
          align: 'center',
          width: pageWidth - margin * 2,
        });

        // ===== BOTTOM BARS =====
        doc.rect(0, doc.page.height - 36, pageWidth, 18).fill(green);
        doc.rect(0, doc.page.height - 18, pageWidth, 18).fill(purple);

        doc.end();
      } catch (error) {
        this.logger.error('Error generating deliverables PDF', error);
        reject(error);
      }
    });
  }

  async generateImage(): Promise<Buffer> {
    const stats = await this.deliverablesService.getStatistics();
    const deliverables = await this.deliverablesService.findAll();

    // Generate a formatted text report (can be enhanced with actual image generation later)
    const lines: string[] = [];
    
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('           CMDA NIGERIA - PROJECT DELIVERABLES REPORT          ');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Generated: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                      SUMMARY STATISTICS                        ');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push(`  Total Items:        ${stats.total || 0}`);
    lines.push(`  Completed:          ${stats.completed || 0}`);
    lines.push(`  In Progress:        ${stats.inProgress || 0}`);
    lines.push(`  Pending:            ${stats.pending || 0}`);
    lines.push(`  Total Hours:        ${(stats.totalHoursActual || 0).toLocaleString()}`);
    lines.push(`  Lines of Code:      ${(stats.totalLinesOfCode || 0).toLocaleString()}`);
    lines.push(`  Total Commits:      ${(stats.totalCommits || 0).toLocaleString()}`);
    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    BREAKDOWN BY CATEGORY                       ');
    lines.push('───────────────────────────────────────────────────────────────');
    
    Object.entries(stats.byCategory || {}).forEach(([cat, data]: [string, any]) => {
      const catLabel = cat.replace(/_/g, ' ').toUpperCase().padEnd(20);
      lines.push(`  ${catLabel} ${data.count} items (${data.hours} hours)`);
    });

    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                   BREAKDOWN BY REPOSITORY                      ');
    lines.push('───────────────────────────────────────────────────────────────');
    
    Object.entries(stats.byRepository || {}).forEach(([repo, data]: [string, any]) => {
      const repoLabel = repo.toUpperCase().padEnd(12);
      lines.push(`  ${repoLabel} ${data.count} items | ${data.hours}h | ${(data.linesOfCode || 0).toLocaleString()} LOC`);
    });

    lines.push('');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                      DELIVERABLES LIST                         ');
    lines.push('───────────────────────────────────────────────────────────────');
    
    deliverables.forEach((item, index) => {
      const status = (item.status || 'pending').replace(/_/g, ' ').toUpperCase();
      const statusIcon = item.status === 'completed' ? '✓' : item.status === 'in_progress' ? '⟳' : '○';
      lines.push(`  ${index + 1}. [${statusIcon}] ${item.title}`);
      lines.push(`      Category: ${(item.category || 'other').replace(/_/g, ' ')} | Hours: ${item.actualTime || item.estimatedTime || 0}`);
      if (item.completionDate) {
        lines.push(`      Completed: ${new Date(item.completionDate).toLocaleDateString('en-GB')}`);
      }
      lines.push('');
    });

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('  CMDA Nigeria - Wholeness House Gwagwalada, FCT, Nigeria      ');
    lines.push('  Email: office@cmdanigeria.org | Phone: +234 803 304 3290     ');
    lines.push('═══════════════════════════════════════════════════════════════');

    return Buffer.from(lines.join('\n'), 'utf-8');
  }
}
