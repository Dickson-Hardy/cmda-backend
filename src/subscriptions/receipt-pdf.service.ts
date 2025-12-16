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

    const expiryDate = subscription.expiryDate
      ? new Date(subscription.expiryDate).toLocaleDateString('en-GB')
      : 'N/A';

    const status = subscription.isPaid ? 'PAID' : 'PENDING';
    const description = this.getSubscriptionDescription(subscription);

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

        const purple = '#994279';

        // Header
        doc.rect(0, 0, doc.page.width, 80).fill(purple);
        doc.fillColor('#FFFFFF').fontSize(24).font('Helvetica-Bold');
        doc.text('CMDA NIGERIA', 50, 25, { align: 'center' });
        doc.fontSize(12).font('Helvetica');
        doc.text('Christian Medical & Dental Association of Nigeria', 50, 50, { align: 'center' });

        // Receipt title
        doc.fillColor('#000000').fontSize(22).font('Helvetica-Bold');
        doc.text('PAYMENT RECEIPT', 50, 110, { align: 'center' });

        // Transaction Information section
        let y = 160;
        doc.fontSize(14).font('Helvetica-Bold').fillColor(purple);
        doc.text('Transaction Information', 50, y);
        doc
          .moveTo(50, y + 18)
          .lineTo(545, y + 18)
          .stroke('#E8D4E0');

        y += 30;
        doc.fontSize(11).font('Helvetica').fillColor('#333333');

        const drawRow = (label: string, value: string) => {
          doc.font('Helvetica-Bold').text(label, 50, y, { continued: false });
          doc.font('Helvetica').text(value, 200, y);
          y += 22;
        };

        drawRow('Receipt Number:', subscription.reference || subscription._id.toString());
        drawRow('Transaction Date:', transactionDate);
        drawRow('Payment Method:', (subscription as any).source || 'Online Payment');
        drawRow('Payment Status:', status);

        // Member Information section
        y += 15;
        doc.fontSize(14).font('Helvetica-Bold').fillColor(purple);
        doc.text('Member Information', 50, y);
        doc
          .moveTo(50, y + 18)
          .lineTo(545, y + 18)
          .stroke('#E8D4E0');

        y += 30;
        doc.fontSize(11).fillColor('#333333');

        drawRow('Full Name:', userData.fullName);
        drawRow('Member ID:', userData.membershipId);
        drawRow('Email:', userData.email);
        drawRow('Member Type:', userData.role);
        drawRow('Region/Chapter:', userData.region);

        // Payment Details section
        y += 15;
        doc.fontSize(14).font('Helvetica-Bold').fillColor(purple);
        doc.text('Payment Details', 50, y);
        doc
          .moveTo(50, y + 18)
          .lineTo(545, y + 18)
          .stroke('#E8D4E0');

        y += 30;
        doc.fontSize(11).fillColor('#333333');

        drawRow('Description:', description);
        drawRow('Subscription Period:', subscription.frequency);
        drawRow('Expiry Date:', expiryDate);

        // Amount box
        y += 25;
        doc.rect(150, y, 295, 70).fill(purple);
        doc.fillColor('#FFFFFF').fontSize(14).font('Helvetica');
        doc.text('TOTAL AMOUNT PAID', 150, y + 15, { width: 295, align: 'center' });
        doc.fontSize(26).font('Helvetica-Bold');
        doc.text(`${subscription.currency} ${subscription.amount.toLocaleString()}`, 150, y + 38, {
          width: 295,
          align: 'center',
        });

        // Thank you section
        y += 100;
        doc.fillColor(purple).fontSize(16).font('Helvetica-Bold');
        doc.text('Thank you for your payment!', 50, y, { align: 'center' });
        doc.fillColor('#666666').fontSize(11).font('Helvetica');
        doc.text(
          'Your support helps CMDA Nigeria fulfill its mission of serving God through healthcare ministry.',
          50,
          y + 25,
          { align: 'center' },
        );

        // Footer
        y += 70;
        doc.moveTo(50, y).lineTo(545, y).stroke('#e5e7eb');
        y += 15;
        doc.fontSize(10).fillColor('#6b7280');
        doc.text('This is a computer-generated receipt and does not require a signature.', 50, y, {
          align: 'center',
        });
        doc.text('For inquiries: office@cmdanigeria.org | +234 803 304 3290', 50, y + 15, {
          align: 'center',
        });
        doc.text(`Receipt generated on: ${new Date().toLocaleString('en-GB')}`, 50, y + 30, {
          align: 'center',
        });

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
