import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DevelopmentInvoice, InvoiceStatus } from './development-invoices.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { RecordPaymentDto } from './dto/create-invoice.dto';

@Injectable()
export class DevelopmentInvoicesService {
  constructor(
    @InjectModel(DevelopmentInvoice.name)
    private invoiceModel: Model<DevelopmentInvoice>,
  ) {}

  async create(createDto: CreateInvoiceDto): Promise<DevelopmentInvoice> {
    const invoice = new this.invoiceModel({
      ...createDto,
      paymentHistory: [],
    });
    return invoice.save();
  }

  async findAll(filters?: {
    status?: InvoiceStatus;
    startDate?: string;
    endDate?: string;
  }): Promise<DevelopmentInvoice[]> {
    const query: any = { isActive: true };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.startDate || filters?.endDate) {
      query.issueDate = {};
      if (filters.startDate) {
        query.issueDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.issueDate.$lte = new Date(filters.endDate);
      }
    }

    // Update overdue status
    const now = new Date();
    await this.invoiceModel.updateMany(
      {
        isActive: true,
        status: { $in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID] },
        dueDate: { $lt: now },
      },
      { status: InvoiceStatus.OVERDUE },
    );

    return this.invoiceModel.find(query).sort({ issueDate: -1 }).exec();
  }

  async findOne(id: string): Promise<DevelopmentInvoice> {
    return this.invoiceModel.findById(id).exec();
  }

  async update(id: string, updateDto: UpdateInvoiceDto): Promise<DevelopmentInvoice> {
    return this.invoiceModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async remove(id: string): Promise<DevelopmentInvoice> {
    return this.invoiceModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }

  async recordPayment(id: string, paymentDto: RecordPaymentDto): Promise<DevelopmentInvoice> {
    const invoice = await this.invoiceModel.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Add to payment history
    invoice.paymentHistory.push({
      amount: paymentDto.amount,
      date: new Date(paymentDto.date),
      method: paymentDto.method,
      reference: paymentDto.reference || '',
      notes: paymentDto.notes || '',
    });

    // Update amount paid
    invoice.amountPaid += paymentDto.amount;

    // Update status
    if (invoice.amountPaid >= invoice.totalAmount) {
      invoice.status = InvoiceStatus.PAID;
      invoice.paidDate = new Date(paymentDto.date);
      invoice.paymentMethod = paymentDto.method;
      invoice.paymentReference = paymentDto.reference;
    } else if (invoice.amountPaid > 0) {
      invoice.status = InvoiceStatus.PARTIALLY_PAID;
    }

    return invoice.save();
  }

  async getStatistics() {
    const invoices = await this.invoiceModel.find({ isActive: true }).exec();

    const stats = {
      total: invoices.length,
      draft: 0,
      sent: 0,
      partiallyPaid: 0,
      paid: 0,
      overdue: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
      byCurrency: {},
      recentInvoices: [],
    };

    invoices.forEach((invoice) => {
      // Status counts
      if (invoice.status === InvoiceStatus.DRAFT) stats.draft++;
      else if (invoice.status === InvoiceStatus.SENT) stats.sent++;
      else if (invoice.status === InvoiceStatus.PARTIALLY_PAID) stats.partiallyPaid++;
      else if (invoice.status === InvoiceStatus.PAID) stats.paid++;
      else if (invoice.status === InvoiceStatus.OVERDUE) stats.overdue++;

      // Financial totals
      stats.totalBilled += invoice.totalAmount;
      stats.totalPaid += invoice.amountPaid;
      stats.totalOutstanding += invoice.totalAmount - invoice.amountPaid;

      if (invoice.status === InvoiceStatus.OVERDUE) {
        stats.overdueAmount += invoice.totalAmount - invoice.amountPaid;
      }

      // By currency
      const currency = invoice.currency;
      if (!stats.byCurrency[currency]) {
        stats.byCurrency[currency] = {
          count: 0,
          billed: 0,
          paid: 0,
          outstanding: 0,
        };
      }
      stats.byCurrency[currency].count++;
      stats.byCurrency[currency].billed += invoice.totalAmount;
      stats.byCurrency[currency].paid += invoice.amountPaid;
      stats.byCurrency[currency].outstanding += invoice.totalAmount - invoice.amountPaid;
    });

    // Recent invoices (last 5)
    stats.recentInvoices = invoices
      .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
      .slice(0, 5)
      .map((inv) => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        title: inv.title,
        amount: inv.totalAmount,
        status: inv.status,
        dueDate: inv.dueDate,
      }));

    return stats;
  }

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.invoiceModel.countDocuments();
    return `INV-${year}${month}-${String(count + 1).padStart(4, '0')}`;
  }
}
