import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Subscription } from './subscription.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class ReceiptService {
  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceipt(subscriptionId: string): Promise<Buffer> {
    const subscription = await this.subscriptionModel
      .findById(subscriptionId)
      .populate('user')
      .exec();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const user = subscription.user as any;
    const userData = user || {
      firstName: 'N/A',
      lastName: '',
      email: 'N/A',
      role: 'N/A',
      membershipId: 'N/A',
      region: 'N/A',
    };

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', (err) => {
          reject(err);
        });

        // Draw outer border/frame
        doc.rect(35, 35, 525, 760).strokeColor('#994279').lineWidth(2).stroke();

        // Inner decorative border
        doc.rect(40, 40, 515, 750).strokeColor('#E8D4E0').lineWidth(1).stroke();

        // Header with logo area
        doc.fontSize(26).font('Helvetica-Bold').fillColor('#994279').text('CMDA NIGERIA', 50, 55);

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('Christian Medical & Dental Association of Nigeria', 50, 87)
          .text('Website: www.cmdanigeria.net', 50, 102)
          .text('Email: office@cmdanigeria.org | Phone: +234 803 304 3290', 50, 117);

        // Receipt title
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('PAYMENT RECEIPT', 50, 155, { align: 'center' });

        // Horizontal line
        doc.moveTo(50, 188).lineTo(545, 188).strokeColor('#994279').lineWidth(2).stroke();

        // Receipt details section
        const leftColumn = 55;
        const rightColumn = 320;
        let y = 220;

        // Transaction Information
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Transaction Information', leftColumn, y);
        y += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        const details = [
          ['Receipt Number:', subscription.reference || subscription._id.toString()],
          [
            'Transaction Date:',
            new Date((subscription as any).createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          ],
          ['Payment Method:', subscription.source || 'Online Payment'],
        ];

        details.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .text(label, leftColumn, y, { continued: true })
            .font('Helvetica')
            .text(' ' + value);
          y += 22;
        });

        // Payment Status with colored badge
        doc.font('Helvetica-Bold').fillColor('#000000').text('Payment Status:', leftColumn, y);

        const status = subscription.isPaid ? 'PAID' : 'PENDING';
        const statusColor = subscription.isPaid ? '#10B981' : '#F59E0B';
        const statusBg = subscription.isPaid ? '#D1FAE5' : '#FEF3C7';

        doc
          .rect(leftColumn + 105, y - 2, 60, 18)
          .fillColor(statusBg)
          .fill();

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(status, leftColumn + 105, y, { width: 60, align: 'center' });

        doc.fontSize(10).fillColor('#000000');
        y += 22;

        y += 20;

        // Member Information
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Member Information', leftColumn, y);
        y += 25;

        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        const memberDetails = [
          ['Full Name:', userData.fullName || `${userData.firstName} ${userData.lastName}`],
          ['Member ID:', userData.membershipId || 'N/A'],
          ['Email:', userData.email || 'N/A'],
          ['Member Type:', userData.role || 'N/A'],
          ['Region/Chapter:', userData.region || 'N/A'],
        ];

        memberDetails.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .text(label, leftColumn, y, { continued: true })
            .font('Helvetica')
            .text(' ' + value);
          y += 22;
        });

        y += 20;

        // Payment Details Box
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Payment Details', leftColumn, y);
        y += 25;

        // Payment details box
        const boxTop = y;
        const boxHeight = 105;

        // Box with border
        doc.rect(leftColumn, boxTop, 490, boxHeight).fillColor('#F9FAFB').fill();
        doc.rect(leftColumn, boxTop, 490, boxHeight).strokeColor('#E5E7EB').lineWidth(1).stroke();

        y = boxTop + 15;

        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        const paymentDetails = [
          ['Description:', this.getSubscriptionDescription(subscription)],
          ['Subscription Period:', subscription.frequency],
          [
            'Expiry Date:',
            subscription.expiryDate
              ? new Date(subscription.expiryDate).toLocaleDateString('en-GB')
              : 'N/A',
          ],
        ];

        paymentDetails.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .text(label, leftColumn + 15, y, { continued: true })
            .font('Helvetica')
            .text(' ' + value);
          y += 22;
        });

        // Amount Section (Highlighted)
        y = boxTop + boxHeight + 25;

        doc.rect(leftColumn, y, 490, 55).fillColor('#994279').fill();
        doc.rect(leftColumn, y, 490, 55).strokeColor('#7A345F').lineWidth(1).stroke();

        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('TOTAL AMOUNT PAID:', leftColumn + 15, y + 18, {
            continued: true,
          })
          .fontSize(20)
          .text(` ${subscription.currency} ${subscription.amount.toLocaleString()}`, {
            align: 'right',
          });

        // Thank You Message
        y += 85;

        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Thank you for your payment!', 50, y, { align: 'center' });

        y += 20;

        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(
            'Your support helps CMDA Nigeria fulfill its mission of serving God through healthcare ministry.',
            50,
            y,
            { align: 'center', width: 495 },
          );

        // Footer Section
        y += 40;

        doc.moveTo(50, y).lineTo(545, y).strokeColor('#D1D5DB').lineWidth(1).stroke();

        y += 18;

        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#6B7280')
          .text('This is a computer-generated receipt and does not require a signature.', 50, y, {
            align: 'center',
          });

        y += 18;

        doc
          .font('Helvetica')
          .text(
            'For inquiries, please contact: office@cmdanigeria.org or call +234 803 304 3290',
            50,
            y,
            { align: 'center' },
          );

        y += 18;

        doc
          .fontSize(8)
          .fillColor('#9CA3AF')
          .text(
            `Receipt generated on: ${new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}`,
            50,
            y,
            {
              align: 'center',
            },
          );

        // Finalize PDF
        doc.end();
      } catch (error) {
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
