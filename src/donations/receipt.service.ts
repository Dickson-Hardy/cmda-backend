import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import PDFDocument from 'pdfkit';
import { Donation } from './donation.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class DonationReceiptService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceipt(donationId: string): Promise<Buffer> {
    const donation = await this.donationModel.findById(donationId).populate('user').exec();

    if (!donation) {
      throw new Error('Donation not found');
    }

    const user = (donation.user as any) || {};
    const userData = {
      firstName: user.firstName || 'N/A',
      lastName: user.lastName || '',
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      membershipId: user.membershipId || 'N/A',
      region: user.region || 'N/A',
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
        doc.on('error', reject);

        // Outer border
        doc.rect(35, 35, 525, 760).strokeColor('#994279').lineWidth(2).stroke();
        // Inner border
        doc.rect(40, 40, 515, 750).strokeColor('#E8D4E0').lineWidth(1).stroke();

        // Header
        doc.fontSize(26).font('Helvetica-Bold').fillColor('#994279').text('CMDA NIGERIA', 50, 55);
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text('Christian Medical & Dental Association of Nigeria', 50, 87)
          .text('Website: www.cmdanigeria.net', 50, 102)
          .text('Email: office@cmdanigeria.org | Phone: +234 803 304 3290', 50, 117);

        // Title
        doc
          .fontSize(22)
          .font('Helvetica-Bold')
          .fillColor('#000000')
          .text('DONATION RECEIPT', 50, 155, {
            align: 'center',
          });
        doc.moveTo(50, 188).lineTo(545, 188).strokeColor('#994279').lineWidth(2).stroke();

        const left = 55;
        const right = 320;
        let y = 220;

        // Donation info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Donation Information', left, y);
        y += 25;
        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        const donationDetails: [string, string][] = [
          ['Receipt Number:', donation.reference || donation._id.toString()],
          [
            'Donation Date:',
            new Date((donation as any).createdAt).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            }),
          ],
          ['Payment Method:', donation.source || 'Online Payment'],
          ['Recurring:', donation.recurring ? 'Yes' : 'No'],
          ['Frequency:', donation.frequency || (donation.recurring ? 'Recurring' : 'One-time')],
        ];

        donationDetails.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .text(label, left, y, { continued: true })
            .font('Helvetica')
            .text(' ' + value);
          y += 22;
        });

        // Payment status badge
        doc.font('Helvetica-Bold').fillColor('#000000').text('Payment Status:', left, y);
        const status = donation.isPaid ? 'PAID' : 'PENDING';
        const statusColor = donation.isPaid ? '#10B981' : '#F59E0B';
        const statusBg = donation.isPaid ? '#D1FAE5' : '#FEF3C7';

        doc
          .rect(left + 105, y - 2, 60, 18)
          .fillColor(statusBg)
          .fill();
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(statusColor)
          .text(status, left + 105, y, { width: 60, align: 'center' });
        doc.fontSize(10).fillColor('#000000');
        y += 42;

        // Donor info
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Donor Information', left, y);
        y += 25;
        doc.fontSize(10).font('Helvetica').fillColor('#000000');

        const donorDetails: [string, string][] = [
          ['Full Name:', userData.fullName],
          ['Member ID:', userData.membershipId],
          ['Email:', userData.email],
          ['Member Type:', userData.role],
          ['Region/Chapter:', userData.region],
        ];

        donorDetails.forEach(([label, value]) => {
          doc
            .font('Helvetica-Bold')
            .text(label, left, y, { continued: true })
            .font('Helvetica')
            .text(' ' + value);
          y += 22;
        });

        y += 20;

        // Areas of Need / Allocation
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Donation Allocation', left, y);
        y += 25;

        const allocations = donation.areasOfNeed?.length
          ? donation.areasOfNeed
          : [{ name: 'General Fund', amount: donation.totalAmount }];

        allocations.forEach((area) => {
          doc
            .font('Helvetica-Bold')
            .text(`${area.name}:`, left, y, { continued: true })
            .font('Helvetica')
            .text(` ${donation.currency} ${area.amount.toLocaleString()}`);
          y += 20;
        });

        y += 10;

        // Amount summary box
        doc.rect(left, y, 490, 55).fillColor('#994279').fill();
        doc.rect(left, y, 490, 55).strokeColor('#7A345F').lineWidth(1).stroke();
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor('#FFFFFF')
          .text('TOTAL DONATION:', left + 15, y + 18, { continued: true })
          .fontSize(20)
          .text(` ${donation.currency} ${donation.totalAmount.toLocaleString()}`, {
            align: 'right',
          });

        y += 75;

        // Thank you
        doc
          .fontSize(14)
          .font('Helvetica-Bold')
          .fillColor('#994279')
          .text('Thank you for your generosity!', 50, y, {
            align: 'center',
          });
        y += 20;
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#666666')
          .text(
            'Your donation helps CMDA Nigeria advance its mission of service through healthcare ministry.',
            50,
            y,
            { align: 'center', width: 495 },
          );

        // Footer
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
          .text('For inquiries, contact: office@cmdanigeria.org or call +234 803 304 3290', 50, y, {
            align: 'center',
          });
        y += 18;
        doc
          .fontSize(8)
          .fillColor('#9CA3AF')
          .text(
            `Receipt generated on: ${new Date().toLocaleString('en-GB', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}`,
            50,
            y,
            { align: 'center' },
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
