import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ServiceSubscription } from './service-subscriptions.schema';

export interface InvoiceData {
  services: ServiceSubscription[];
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: { NGN: number; USD: number };
}

@Injectable()
export class ServiceInvoicePdfService {
  private readonly logger = new Logger(ServiceInvoicePdfService.name);

  // Payment details
  private readonly paymentDetails = {
    accountName: 'Abawulor Dickson',
    bankName: 'United Bank for Africa (UBA)',
    accountNumber: '2079456074',
  };

  async generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
    const { services, invoiceNumber, invoiceDate, dueDate, totalAmount } = data;

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
        doc.fontSize(28).font('Helvetica-Bold').text('SERVICE RENEWAL INVOICE', margin, y);

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

        // ===== INVOICE DETAILS =====
        y = 100;
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000');

        // Invoice Number
        doc.text('Invoice No:', margin, y);
        doc.font('Helvetica').text(invoiceNumber, margin + 80, y);

        y += 20;
        // Invoice Date
        doc.font('Helvetica-Bold').text('Invoice Date:', margin, y);
        doc.font('Helvetica').text(
          invoiceDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          margin + 80,
          y,
        );

        y += 20;
        // Due Date
        doc.font('Helvetica-Bold').text('Due Date:', margin, y);
        doc.font('Helvetica').fillColor('#cc0000').text(
          dueDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          margin + 80,
          y,
        );

        // ===== PAYMENT DETAILS BOX =====
        const paymentBoxX = pageWidth - 250;
        const paymentBoxY = 100;
        const paymentBoxWidth = 200;
        const paymentBoxHeight = 80;

        doc.rect(paymentBoxX, paymentBoxY, paymentBoxWidth, paymentBoxHeight).stroke('#cccccc');
        doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
        doc.text('PAYMENT DETAILS', paymentBoxX + 10, paymentBoxY + 10);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Account Name: ${this.paymentDetails.accountName}`, paymentBoxX + 10, paymentBoxY + 28);
        doc.text(`Bank: ${this.paymentDetails.bankName}`, paymentBoxX + 10, paymentBoxY + 42);
        if (this.paymentDetails.accountNumber) {
          doc.text(`Account No: ${this.paymentDetails.accountNumber}`, paymentBoxX + 10, paymentBoxY + 56);
        }

        // ===== SERVICES TABLE =====
        y = 200;
        const tableLeft = margin;
        const tableWidth = pageWidth - margin * 2;
        const colWidths = [180, 100, 80, 70, 65]; // Service, Provider, Category, Renewal, Amount
        const rowHeight = 30;

        // Table header
        doc.rect(tableLeft, y, tableWidth, rowHeight).fill(green);
        doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');

        let colX = tableLeft + 8;
        doc.text('Service', colX, y + 10);
        colX += colWidths[0];
        doc.text('Provider', colX, y + 10);
        colX += colWidths[1];
        doc.text('Category', colX, y + 10);
        colX += colWidths[2];
        doc.text('Renewal', colX, y + 10);
        colX += colWidths[3];
        doc.text('Amount', colX, y + 10, { width: colWidths[4] - 8, align: 'right' });

        // Table rows
        y += rowHeight;
        doc.fillColor('#000000').font('Helvetica').fontSize(8);

        let ngnTotal = 0;
        let usdTotal = 0;

        for (const service of services) {
          // Alternate row background
          const rowIndex = services.indexOf(service);
          if (rowIndex % 2 === 0) {
            doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#f9f9f9');
          }

          // Draw row borders
          doc.rect(tableLeft, y, tableWidth, rowHeight).stroke('#e0e0e0');

          // Row content
          doc.fillColor('#000000');
          colX = tableLeft + 8;

          // Service name (truncate if too long)
          const serviceName =
            service.serviceName.length > 28
              ? service.serviceName.substring(0, 25) + '...'
              : service.serviceName;
          doc.text(serviceName, colX, y + 10, { width: colWidths[0] - 10 });
          colX += colWidths[0];

          doc.text(service.provider || 'N/A', colX, y + 10, { width: colWidths[1] - 10 });
          colX += colWidths[1];

          const category = (service.category || 'other').replace(/_/g, ' ');
          doc.text(category.charAt(0).toUpperCase() + category.slice(1), colX, y + 10, {
            width: colWidths[2] - 10,
          });
          colX += colWidths[2];

          const renewalDate = new Date(service.renewalDate).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          });
          doc.text(renewalDate, colX, y + 10, { width: colWidths[3] - 10 });
          colX += colWidths[3];

          const currency = service.currency || 'NGN';
          const amount = service.cost || 0;
          if (currency === 'USD') {
            usdTotal += amount;
          } else {
            ngnTotal += amount;
          }

          doc.text(`${currency} ${amount.toLocaleString()}`, colX, y + 10, {
            width: colWidths[4] - 8,
            align: 'right',
          });

          y += rowHeight;

          // Check if we need a new page
          if (y > doc.page.height - 200) {
            doc.addPage();
            y = 50;
          }
        }

        // ===== TOTALS SECTION =====
        y += 20;
        const totalsX = pageWidth - 200;
        const totalsWidth = 150;

        doc.fontSize(11).font('Helvetica-Bold');

        if (ngnTotal > 0) {
          doc.rect(totalsX, y, totalsWidth, 30).fillAndStroke('#efebe7', '#2c2c2c');
          doc.fillColor('#000000');
          doc.text('Total (NGN):', totalsX + 10, y + 8);
          doc.fontSize(12).text(`NGN ${ngnTotal.toLocaleString()}`, totalsX + 10, y + 8, {
            width: totalsWidth - 20,
            align: 'right',
          });
          y += 35;
        }

        if (usdTotal > 0) {
          doc.rect(totalsX, y, totalsWidth, 30).fillAndStroke('#efebe7', '#2c2c2c');
          doc.fillColor('#000000');
          doc.fontSize(11).text('Total (USD):', totalsX + 10, y + 8);
          doc.fontSize(12).text(`$ ${usdTotal.toLocaleString()}`, totalsX + 10, y + 8, {
            width: totalsWidth - 20,
            align: 'right',
          });
          y += 35;
        }

        // ===== NOTES SECTION =====
        y += 30;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
        doc.text('IMPORTANT NOTES:', margin, y);

        y += 18;
        doc.fontSize(9).font('Helvetica');
        doc.text('• Please ensure payment is made before the renewal dates to avoid service interruption.', margin, y);
        y += 14;
        doc.text('• After payment, please send proof of payment to office@cmdanigeria.org', margin, y);
        y += 14;
        doc.text('• For any queries, contact the IT department.', margin, y);

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
        this.logger.error('Error generating service invoice PDF', error);
        reject(error);
      }
    });
  }
}
