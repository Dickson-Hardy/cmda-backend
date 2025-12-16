import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as PDFDocument from 'pdfkit';
import { Donation } from './donation.schema';
import { User } from '../users/schema/users.schema';

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

    const address = isGlobal
      ? {
          street: '1928 Woodlawn Drive,',
          city: 'Woodlawn, Maryland, 21207.',
          phone: '+1 (443) 557 4199',
          email: 'give@cmdanigeriaglobal.org',
          orgName: 'CMDA NIGERIA-GLOBAL NETWORK',
        }
      : {
          street: 'Wholeness House Gwagwalada,',
          city: 'FCT, Nigeria.',
          phone: '+234 803 304 3290',
          email: 'office@cmdanigeria.org',
          orgName: 'CMDA NIGERIA',
        };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const purple = '#6f1d46';
        const green = '#009246';

        // Top bar
        doc.rect(0, 0, doc.page.width, 20).fill(purple);

        // Header
        doc.fillColor('#000000');
        doc.fontSize(32).font('Helvetica-Bold').text('DONATION RECEIPT', 50, 50);

        // Date and Invoice
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`Date: ${transactionDate}`, 50, 100);
        doc.text(
          `Invoice No: ${donation.reference || donation._id.toString().substring(0, 8).toUpperCase()}`,
          50,
          120,
        );

        // Organization info (right side)
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text(address.orgName, 400, 50, { width: 150, align: 'right' });

        // Payee section
        doc.fontSize(18).font('Helvetica-Bold').text('PAYEE DETAILS', 50, 170);
        doc.fontSize(14).font('Helvetica');
        doc.text(`Name: ${userData.fullName}`, 50, 200);
        doc.text(`Email: ${userData.email}`, 50, 220);

        // Table header
        const tableTop = 270;
        doc.rect(50, tableTop, 495, 30).fill(green);
        doc.fillColor('#FFFFFF').fontSize(12).font('Helvetica-Bold');
        doc.text('Date', 60, tableTop + 10);
        doc.text('Item Description', 180, tableTop + 10);
        doc.text('Amount', 420, tableTop + 10, { width: 100, align: 'right' });

        // Table rows
        doc.fillColor('#000000').font('Helvetica');
        let rowY = tableTop + 35;

        if (donation.areasOfNeed && donation.areasOfNeed.length > 0) {
          for (const area of donation.areasOfNeed) {
            doc.text(shortDate, 60, rowY);
            doc.text(area.name, 180, rowY);
            doc.text(`${donation.currency || '$'} ${area.amount.toLocaleString()}`, 420, rowY, {
              width: 100,
              align: 'right',
            });
            doc
              .moveTo(50, rowY + 20)
              .lineTo(545, rowY + 20)
              .stroke('#c1c1c1');
            rowY += 25;
          }
        } else {
          doc.text(shortDate, 60, rowY);
          doc.text('Donation', 180, rowY);
          doc.text(
            `${donation.currency || '$'} ${donation.totalAmount.toLocaleString()}`,
            420,
            rowY,
            { width: 100, align: 'right' },
          );
          doc
            .moveTo(50, rowY + 20)
            .lineTo(545, rowY + 20)
            .stroke('#c1c1c1');
          rowY += 25;
        }

        // Empty row for table spacing
        doc
          .moveTo(50, rowY + 20)
          .lineTo(545, rowY + 20)
          .stroke('#c1c1c1');

        // Thank you section
        const footerY = rowY + 60;
        doc.fontSize(28).font('Helvetica-Bold').text('THANK YOU!', 50, footerY);

        doc.fontSize(10).font('Helvetica');
        doc.text(`Address: ${address.street}`, 50, footerY + 40);
        doc.text(address.city, 50, footerY + 55);
        doc.text(`Phone: ${address.phone}`, 50, footerY + 70);
        doc.text(`Email: ${address.email}`, 50, footerY + 85);

        // Total box
        doc.rect(380, footerY, 165, 70).fillAndStroke('#efebe7', '#2c2c2c');
        doc.fillColor('#000000').fontSize(14).font('Helvetica-Bold');
        doc.text('Total:', 400, footerY + 15);
        doc.fontSize(22);
        doc.text(
          `${donation.currency || '$'} ${donation.totalAmount.toLocaleString()}`,
          400,
          footerY + 35,
        );

        // Signature line
        const sigY = footerY + 130;
        doc.moveTo(350, sigY).lineTo(545, sigY).stroke('#2c2c2c');
        doc.fontSize(12).font('Helvetica-Oblique');
        doc.text('Dr. Jane Uche-Ejekwu', 350, sigY + 5, { width: 195, align: 'center' });

        // Bottom bars
        const bottomY = doc.page.height - 40;
        doc.rect(0, bottomY, doc.page.width, 20).fill(green);
        doc.rect(0, bottomY + 20, doc.page.width, 20).fill(purple);

        doc.end();
      } catch (error) {
        this.logger.error('Error generating PDF receipt', error);
        reject(error);
      }
    });
  }
}
