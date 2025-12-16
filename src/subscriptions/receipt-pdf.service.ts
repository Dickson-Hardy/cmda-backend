import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import { Subscription } from './subscription.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class ReceiptPdfService {
  private readonly logger = new Logger(ReceiptPdfService.name);

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceiptPdf(subscriptionId: string): Promise<Buffer> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .populate('user')
      .exec();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const user = (subscription.user as any) || {};
    const userData = {
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      membershipId: user.membershipId || 'N/A',
      region: user.region || 'N/A',
    };

    const transactionDate = new Date((subscription as any).createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const shortDate = new Date((subscription as any).createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });

    const expiryDate = subscription.expiryDate
      ? new Date(subscription.expiryDate).toLocaleDateString('en-GB')
      : 'N/A';

    // Determine if payment is global or Nigerian
    const currency = (subscription.currency || 'NGN').toUpperCase();
    const isGlobal = currency === 'USD' || currency === '$';
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

    // Only completed payments can download receipts, so status is always PAID
    const status = 'PAID';
    const description = this.getSubscriptionDescription(subscription);

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

        // Title - SUBSCRIPTION RECEIPT
        doc.fillColor('#000000');
        doc.fontSize(28).font('Helvetica-Bold').text('SUBSCRIPTION RECEIPT', margin, y);

        // Organization info (right side)
        doc.fontSize(8).font('Helvetica-Bold');
        doc.text(address.orgName, pageWidth - 220, y, { width: 170, align: 'right' });
        doc
          .fontSize(7)
          .text(address.orgShort, pageWidth - 220, y + 35, { width: 170, align: 'right' });

        // ===== DATE AND INVOICE =====
        y = 95;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Date:', margin, y);
        doc.font('Helvetica').text(transactionDate, margin + 35, y);
        // Underline
        doc
          .moveTo(margin + 35, y + 14)
          .lineTo(margin + 150, y + 14)
          .stroke('#000000');

        y += 25;
        doc.font('Helvetica-Bold').text('No. Invoice :', margin, y);
        const invoiceNo =
          subscription.reference || subscription._id.toString().substring(0, 12).toUpperCase();
        doc.font('Helvetica').text(invoiceNo, margin + 70, y);
        // Underline
        doc
          .moveTo(margin + 70, y + 14)
          .lineTo(margin + 220, y + 14)
          .stroke('#000000');

        // ===== PAYEE DETAILS SECTION =====
        y = 170;
        doc.fontSize(16).font('Helvetica-Bold').text('MEMBER DETAILS', margin, y);

        y += 25;
        doc.fontSize(13).font('Helvetica-Bold').text(userData.fullName, margin, y);

        y += 20;
        doc.fontSize(13).font('Helvetica').text(userData.email, margin, y);

        y += 20;
        doc
          .fontSize(11)
          .font('Helvetica')
          .text(
            `Member ID: ${userData.membershipId}  |  ${userData.role}  |  ${userData.region}`,
            margin,
            y,
          );

        // ===== STATUS BADGE =====
        const statusX = pageWidth - 150;
        const statusY = 170;
        const statusWidth = 80;
        const statusHeight = 25;
        const statusColor = subscription.isPaid ? green : '#F59E0B';
        doc.roundedRect(statusX, statusY, statusWidth, statusHeight, 5).fill(statusColor);
        doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold');
        doc.text(status, statusX, statusY + 7, { width: statusWidth, align: 'center' });

        // ===== TABLE =====
        y = 260;
        const tableLeft = margin;
        const tableWidth = pageWidth - margin * 2;
        const col1Width = 100;
        const col2Width = tableWidth - col1Width - 120;
        const col3Width = 120;
        const rowHeight = 35;

        // Table header
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(green);
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
        doc.text('Date', tableLeft + 15, y + 12);
        doc.text('Item Description', tableLeft + col1Width + 20, y + 12);
        doc.text('Amount', tableLeft + col1Width + col2Width + 10, y + 12, {
          width: col3Width - 20,
          align: 'right',
        });

        // Table row
        y += rowHeight;
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);

        // Draw row borders
        doc.rect(tableLeft, y, col1Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width, y, col2Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width + col2Width, y, col3Width, rowHeight).stroke('#c1c1c1');

        // Row content
        doc.fillColor('#000000');
        doc.text(shortDate, tableLeft + 15, y + 12);
        doc.text(description, tableLeft + col1Width + 20, y + 12, {
          width: col2Width - 40,
          align: 'center',
        });
        doc.text(
          `${currencySymbol} ${subscription.amount.toLocaleString()}`,
          tableLeft + col1Width + col2Width + 10,
          y + 12,
          { width: col3Width - 20, align: 'right' },
        );

        y += rowHeight;

        // Additional info row
        doc.rect(tableLeft, y, col1Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width, y, col2Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width + col2Width, y, col3Width, rowHeight).stroke('#c1c1c1');

        doc.fontSize(10).font('Helvetica');
        doc.text('Expiry:', tableLeft + 15, y + 12);
        doc.text(expiryDate, tableLeft + col1Width + 20, y + 12, {
          width: col2Width - 40,
          align: 'center',
        });
        doc.text(
          subscription.frequency || 'Annual',
          tableLeft + col1Width + col2Width + 10,
          y + 12,
          { width: col3Width - 20, align: 'right' },
        );

        y += rowHeight;

        // Empty row for spacing
        doc.rect(tableLeft, y, col1Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width, y, col2Width, rowHeight).stroke('#c1c1c1');
        doc.rect(tableLeft + col1Width + col2Width, y, col3Width, rowHeight).stroke('#c1c1c1');
        y += rowHeight;

        // ===== THANK YOU SECTION =====
        const thankYouY = y + 40;

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

        doc
          .rect(totalBoxX, totalBoxY, totalBoxWidth, totalBoxHeight)
          .fillAndStroke('#efebe7', '#2c2c2c');
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold');
        doc.text('Total:', totalBoxX + 15, totalBoxY + 12);
        doc.fontSize(24).font('Helvetica-Bold');
        doc.text(
          `${currencySymbol} ${subscription.amount.toLocaleString()}`,
          totalBoxX + 15,
          totalBoxY + 32,
        );

        // ===== SIGNATURE =====
        const sigY = thankYouY + 130;
        const sigX = pageWidth - 220;

        // Signature line
        doc
          .moveTo(sigX, sigY)
          .lineTo(sigX + 170, sigY)
          .stroke('#2c2c2c');

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

  private getSubscriptionDescription(subscription: any): string {
    if (subscription.isLifetime) {
      return `Lifetime Membership (${subscription.lifetimeType || 'Standard'})`;
    }
    if (subscription.isVisionPartner) {
      return 'Vision Partner Donation';
    }
    if (subscription.incomeBracket) {
      return `Global Network ${subscription.frequency} Subscription`;
    }
    return `${subscription.frequency} Membership Subscription`;
  }
}
