import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import { Donation } from './donation.schema';
import { User } from '../users/schema/users.schema';
import * as path from 'path';

@Injectable()
export class DonationReceiptPdfService {
  private readonly logger = new Logger(DonationReceiptPdfService.name);

  constructor(
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceiptPdf(donationId: string): Promise<Buffer> {
    const donation = await this.donationModel.findById(donationId).populate('user').exec();

    if (!donation) {
      throw new Error('Donation not found');
    }

    const user = (donation.user as any) || {};
    const userData = {
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email || 'N/A',
    };

    const transactionDate = new Date((donation as any).createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const shortDate = new Date((donation as any).createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    // Determine if payment is global or Nigerian
    const isGlobal = donation.currency === 'USD' || donation.currency === '$';
    const currencySymbol = isGlobal ? '$' : '₦';

    const address = isGlobal
      ? {
          street: '1928 Woodlawn Drive,',
          city: 'Woodlawn, Maryland, 21207.',
          phone: '+1 (443) 557 4199',
          email: 'give@cmdanigeriaglobal.org,',
          email2: 'info@cmdanigeriaglobal.org',
          orgName: 'CHRISTIAN MEDICAL\nANDDENTAL ASSOCIATION\nOF NIGERIA GLOBAL NETWORK',
          orgShort: '(CMDA NIGERIA-GLOBAL NETWORK)',
        }
      : {
          street: 'Wholeness House Gwagwalada,',
          city: 'FCT, Nigeria.',
          phone: '+234 803 304 3290',
          email: 'office@cmdanigeria.org,',
          email2: 'info@cmdanigeria.org',
          orgName: 'CHRISTIAN MEDICAL\nAND DENTAL ASSOCIATION\nOF NIGERIA',
          orgShort: '(CMDA NIGERIA)',
        };

    // Payment status
    const status = donation.isPaid ? 'PAID' : 'PENDING';

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const purple = '#6f1d46';
        const green = '#009246';
        const margin = 50;

        // ===== TOP PURPLE BAR =====
        doc.rect(0, 0, pageWidth, 18).fill(purple);

        // ===== HEADER SECTION =====
        let y = 40;

        // Title - DONATION RECEIPT
        doc.fillColor('#000000');
        doc.fontSize(28).font('Helvetica-Bold').text('DONATION RECIEPT', margin, y);

        // Organization info (right side)
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text(address.orgName, pageWidth - 220, y, { width: 170, align: 'right' });
        doc.fontSize(7).text(address.orgShort, pageWidth - 220, y + 35, { width: 170, align: 'right' });

        // ===== DATE AND INVOICE =====
        y = 95;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Date:', margin, y);
        doc.font('Helvetica').text(transactionDate, margin + 35, y);
        // Underline
        doc.moveTo(margin + 35, y + 14).lineTo(margin + 150, y + 14).stroke('#000000');

        y += 25;
        doc.font('Helvetica-Bold').text('No. Invoice :', margin, y);
        const invoiceNo = donation.reference || donation._id.toString().substring(0, 12).toUpperCase();
        doc.font('Helvetica').text(invoiceNo, margin + 70, y);
        // Underline
        doc.moveTo(margin + 70, y + 14).lineTo(margin + 220, y + 14).stroke('#000000');

        // ===== PAYEE DETAILS SECTION =====
        y = 170;
        doc.fontSize(16).font('Helvetica-Bold').text('PAYEE DETAILS', margin, y);
        
        y += 25;
        doc.fontSize(13).font('Helvetica-Bold').text(userData.fullName, margin, y);
        
        y += 20;
        doc.fontSize(13).font('Helvetica').text(userData.email, margin, y);

        // ===== STATUS BADGE =====
        const statusX = pageWidth - 150;
        const statusY = 170;
        const statusWidth = 80;
        const statusHeight = 25;
        const statusColor = donation.isPaid ? green : '#F59E0B';
        doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 5).fill(statusColor);
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(status, statusX, statusY + 7, { width: statusWidth, align: 'center' });

        // ===== TABLE =====
        y = 240;
        const tableLeft = margin;
        const tableWidth = pageWidth - (margin * 2);
        const col1Width = 100;
        const col2Width = tableWidth - col1Width - 120;
        const col3Width = 120;
        const rowHeight = 35;

        // Table header
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(green);
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
        doc.text('Date', tableLeft + 15, y + 12);
        doc.text('Item Description', tableLeft + col1Width + 20, y + 12);
        doc.text('Amount', tableLeft + col1Width + col2Width + 10, y + 12, { width: col3Width - 20, align: 'right' });

        // Table rows
        y += rowHeight;
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);

        const items = donation.areasOfNeed && donation.areasOfNeed.length > 0
          ? donation.areasOfNeed
          : [{ name: 'Donation', amount: donation.totalAmount }];

        for (const item of items) {
          // Draw row borders
          doc.rect(tableLeft, y, col1Width, rowHeight).stroke('#c1c1c1');
          doc.rect(tableLeft + col1Width, y, col2Width, rowHeight).stroke('#c1c1c1');
          doc.rect(tableLeft + col1Width + col2Width, y, col3Width, rowHeight).stroke('#c1c1c1');

          // Row content
          doc.fillColor('#000000');
          doc.text(shortDate, tableLeft + 15, y + 12);
          doc.text(item.name, tableLeft + col1Width + 20, y + 12, { width: col2Width - 40, align: 'center' });
          doc.text(`${currencySymbol} ${item.amount.toLocaleString()}`, tableLeft + col1Width + col2Width + 10, y + 12, { width: col3Width - 20, align: 'right' });

          y += rowHeight;
        }

        // Empty row for spacing
        doc.rect(tableLeft, y, col1Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width, y, col2Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width + col2Width, y, col3Width, rowHeight).stroke('#c1c1c1');
        y += rowHeight;

        // ===== THANK YOU SECTION =====
        const thankYouY = y + 60;

        // Thank you text
        doc.fontSize(32).font('Helvetica-Bold').fillColor('#000000');
        doc.text('THANK YOU!', margin, thankYouY);

        // Contact info
        doc.fontSize(10).font('Helvetica-Bold');
        let contactY = thankYouY + 50;
        doc.text(`Address - ${address.street}`, margin, contactY);
        contactY += 15;
        doc.text(address.city, margin, contactY);
        contactY += 15;
        doc.text(`Phone - ${address.phone}`, margin, contactY);
        contactY += 15;
        doc.text(`Email- ${address.email}`, margin, contactY);
        contactY += 15;
        doc.text(address.email2, margin, contactY);

        // ===== TOTAL BOX =====
        const totalBoxX = pageWidth - 200;
        const totalBoxY = thankYouY;
        const totalBoxWidth = 150;
        const totalBoxHeight = 60;

        doc.rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight).fillAndStroke('#efebe7', '#2c2c2c');
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold');
        doc.text('Total:', totalBoxX + 15, totalBoxY + 12);
        doc.fontSize(24).font('Helvetica-Bold');
        doc.text(`${currencySymbol} ${donation.totalAmount.toLocaleString()}`, totalBoxX + 15, totalBoxY + 32);

        // ===== SIGNATURE =====
        const sigY = thankYouY + 130;
        const sigX = pageWidth - 220;

        // Signature line
        doc.moveTo(sigX, sigY).lineTo(sigX + 170, sigY).stroke('#2c2c2c');
        
        // Signature name
        doc.fontSize(14).font('Helvetica-Oblique').fillColor('#000000');
        doc.text('Dr. Jane Uche-Ejekwu', sigX, sigY + 8, { width: 170, align: 'center' });

        // ===== BOTTOM BARS =====
        doc.rect(0, pageHeight - 36, pageWidth, 18).fill(green);
        doc.rect(0, pageHeight - 18, pageWidth, 18).fill(purple);

        doc.end();
      } catch (error) {
        this.logger.error('Error generating PDF receipt', error);
        reject(error);
      }
    });
  }
}
