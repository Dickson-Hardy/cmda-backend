import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ServiceSubscription, ServiceStatus } from './service-subscriptions.schema';
import { CreateServiceSubscriptionDto } from './dto/create-service-subscription.dto';
import { UpdateServiceSubscriptionDto } from './dto/update-service-subscription.dto';
import { RenewServiceDto } from './dto/create-service-subscription.dto';
import { EmailService } from '../email/email.service';
import { ServiceInvoicePdfService, InvoiceData } from './service-invoice-pdf.service';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class ServiceSubscriptionsService {
  constructor(
    @InjectModel(ServiceSubscription.name)
    private subscriptionModel: Model<ServiceSubscription>,
    private emailService: EmailService,
    private invoicePdfService: ServiceInvoicePdfService,
    private mailerService: MailerService,
  ) {}

  async create(createDto: CreateServiceSubscriptionDto): Promise<ServiceSubscription> {
    const subscription = new this.subscriptionModel({
      ...createDto,
      renewalHistory: [],
    });
    return subscription.save();
  }

  async findAll(filters?: {
    status?: ServiceStatus;
    category?: string;
    provider?: string;
    search?: string;
    expiringSoon?: boolean;
  }): Promise<ServiceSubscription[]> {
    const query: any = { isActive: true };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.provider) {
      query.provider = { $regex: filters.provider, $options: 'i' };
    }
    if (filters?.search) {
      query.$or = [
        { serviceName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { provider: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Update statuses before fetching
    await this.updateStatuses();

    let services = await this.subscriptionModel.find(query).sort({ renewalDate: 1 }).exec();

    if (filters?.expiringSoon) {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      services = services.filter((s) => s.renewalDate >= now && s.renewalDate <= sevenDaysFromNow);
    }

    return services;
  }

  async findOne(id: string): Promise<ServiceSubscription> {
    return this.subscriptionModel.findById(id).exec();
  }

  async update(id: string, updateDto: UpdateServiceSubscriptionDto): Promise<ServiceSubscription> {
    return this.subscriptionModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
  }

  async remove(id: string): Promise<ServiceSubscription> {
    return this.subscriptionModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
  }

  async renewService(id: string, renewDto: RenewServiceDto): Promise<ServiceSubscription> {
    const service = await this.subscriptionModel.findById(id);
    if (!service) {
      throw new Error('Service not found');
    }

    // Add to renewal history
    service.renewalHistory.push({
      date: new Date(),
      cost: renewDto.cost,
      notes: renewDto.notes || '',
    });

    // Update renewal date and last renewal
    service.lastRenewalDate = new Date();
    service.renewalDate = new Date(renewDto.renewalDate);
    service.cost = renewDto.cost;
    service.status = ServiceStatus.ACTIVE;

    return service.save();
  }

  async quickRenewService(id: string): Promise<ServiceSubscription> {
    const service = await this.subscriptionModel.findById(id);
    if (!service) {
      throw new Error('Service not found');
    }

    // Calculate new renewal date based on billing cycle
    const currentRenewalDate = new Date(service.renewalDate);
    const newRenewalDate = new Date(currentRenewalDate);

    switch (service.billingCycle) {
      case 'monthly':
        newRenewalDate.setMonth(currentRenewalDate.getMonth() + 1);
        break;
      case 'quarterly':
        newRenewalDate.setMonth(currentRenewalDate.getMonth() + 3);
        break;
      case 'semi-annually':
        newRenewalDate.setMonth(currentRenewalDate.getMonth() + 6);
        break;
      case 'annually':
        newRenewalDate.setFullYear(currentRenewalDate.getFullYear() + 1);
        break;
      case 'biennially':
        newRenewalDate.setFullYear(currentRenewalDate.getFullYear() + 2);
        break;
      default:
        newRenewalDate.setFullYear(currentRenewalDate.getFullYear() + 1);
    }

    // Add to renewal history
    service.renewalHistory.push({
      date: new Date(),
      cost: service.cost,
      notes: 'Quick renewal',
    });

    // Update renewal date and last renewal
    service.lastRenewalDate = new Date();
    service.renewalDate = newRenewalDate;
    service.status = ServiceStatus.ACTIVE;

    return service.save();
  }

  async updateStatuses(): Promise<void> {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Mark as expired
    await this.subscriptionModel.updateMany(
      {
        isActive: true,
        renewalDate: { $lt: now },
        status: { $ne: ServiceStatus.CANCELLED },
      },
      { status: ServiceStatus.EXPIRED },
    );

    // Mark as expiring soon
    await this.subscriptionModel.updateMany(
      {
        isActive: true,
        renewalDate: { $gte: now, $lte: sevenDaysFromNow },
        status: { $nin: [ServiceStatus.CANCELLED, ServiceStatus.EXPIRED] },
      },
      { status: ServiceStatus.EXPIRING_SOON },
    );

    // Mark as active
    await this.subscriptionModel.updateMany(
      {
        isActive: true,
        renewalDate: { $gt: sevenDaysFromNow },
        status: { $nin: [ServiceStatus.CANCELLED, ServiceStatus.SUSPENDED] },
      },
      { status: ServiceStatus.ACTIVE },
    );
  }

  async getStatistics() {
    await this.updateStatuses();
    const services = await this.subscriptionModel.find({ isActive: true }).exec();

    const stats = {
      totalServices: services.length,
      active: 0,
      expiringServices: 0,
      expired: 0,
      cancelled: 0,
      totalMonthlyCost: { USD: 0, NGN: 0 },
      totalYearlyCost: { USD: 0, NGN: 0 },
      byCategory: {},
      byProvider: {},
      upcomingRenewals: [],
    };

    services.forEach((service) => {
      // Status counts
      if (service.status === ServiceStatus.ACTIVE) stats.active++;
      else if (service.status === ServiceStatus.EXPIRING_SOON) stats.expiringServices++;
      else if (service.status === ServiceStatus.EXPIRED) stats.expired++;
      else if (service.status === ServiceStatus.CANCELLED) stats.cancelled++;

      const currency = service.currency || 'USD';

      // Cost calculations based on billing cycle
      let monthlyCost = 0;
      let yearlyCost = 0;

      switch (service.billingCycle) {
        case 'monthly':
          monthlyCost = service.cost;
          yearlyCost = service.cost * 12;
          break;
        case 'quarterly':
          monthlyCost = service.cost / 3;
          yearlyCost = service.cost * 4;
          break;
        case 'semi-annually':
          monthlyCost = service.cost / 6;
          yearlyCost = service.cost * 2;
          break;
        case 'annually':
        case 'yearly':
          monthlyCost = service.cost / 12;
          yearlyCost = service.cost;
          break;
        case 'biennially':
          monthlyCost = service.cost / 24;
          yearlyCost = service.cost / 2;
          break;
        default:
          // Default to annual if unknown
          monthlyCost = service.cost / 12;
          yearlyCost = service.cost;
      }

      stats.totalMonthlyCost[currency] += monthlyCost;
      stats.totalYearlyCost[currency] += yearlyCost;

      // By category
      const cat = service.category;
      if (!stats.byCategory[cat]) {
        stats.byCategory[cat] = { count: 0, cost: 0 };
      }
      stats.byCategory[cat].count++;
      stats.byCategory[cat].cost += service.cost;

      // By provider
      const provider = service.provider;
      if (!stats.byProvider[provider]) {
        stats.byProvider[provider] = { count: 0, cost: 0 };
      }
      stats.byProvider[provider].count++;
      stats.byProvider[provider].cost += service.cost;
    });

    // Upcoming renewals (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    stats.upcomingRenewals = services
      .filter(
        (s) =>
          s.renewalDate >= now &&
          s.renewalDate <= thirtyDaysFromNow &&
          s.status !== ServiceStatus.CANCELLED,
      )
      .sort((a, b) => a.renewalDate.getTime() - b.renewalDate.getTime())
      .slice(0, 10)
      .map((s) => ({
        id: s._id,
        serviceName: s.serviceName,
        renewalDate: s.renewalDate,
        cost: s.cost,
        daysUntilRenewal: Math.ceil(
          (s.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      }));

    return stats;
  }

  async getAnnualReport(year: number) {
    const startDate = new Date(year, 0, 1); // January 1st
    const endDate = new Date(year, 11, 31, 23, 59, 59); // December 31st

    const services = await this.subscriptionModel
      .find({
        isActive: true,
        $or: [
          { purchaseDate: { $gte: startDate, $lte: endDate } },
          { renewalDate: { $gte: startDate, $lte: endDate } },
          {
            renewalHistory: {
              $elemMatch: {
                date: { $gte: startDate, $lte: endDate },
              },
            },
          },
        ],
      })
      .exec();

    // Calculate total spending for the year
    const spending = {
      USD: 0,
      NGN: 0,
    };

    const spendingByCategory = {};
    const spendingByProvider = {};
    const spendingByMonth = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i).toLocaleString('default', { month: 'long' }),
      USD: 0,
      NGN: 0,
    }));

    services.forEach((service) => {
      const currency = service.currency || 'USD';

      // Count renewals in this year
      const renewalsInYear =
        service.renewalHistory?.filter((renewal) => {
          const renewalDate = new Date(renewal.date);
          return renewalDate >= startDate && renewalDate <= endDate;
        }) || [];

      renewalsInYear.forEach((renewal) => {
        const cost = renewal.cost || service.cost;
        spending[currency] += cost;

        // By category
        const cat = service.category;
        if (!spendingByCategory[cat]) {
          spendingByCategory[cat] = { USD: 0, NGN: 0 };
        }
        spendingByCategory[cat][currency] += cost;

        // By provider
        const provider = service.provider;
        if (!spendingByProvider[provider]) {
          spendingByProvider[provider] = { USD: 0, NGN: 0 };
        }
        spendingByProvider[provider][currency] += cost;

        // By month
        const month = new Date(renewal.date).getMonth();
        spendingByMonth[month][currency] += cost;
      });
    });

    return {
      year,
      totalSpending: spending,
      spendingByCategory,
      spendingByProvider,
      spendingByMonth,
      totalServices: services.length,
      totalRenewals: services.reduce(
        (sum, s) =>
          sum +
          (s.renewalHistory?.filter((r) => {
            const d = new Date(r.date);
            return d >= startDate && d <= endDate;
          }).length || 0),
        0,
      ),
    };
  }

  async generateSpendingReport(year: number) {
    const annualReport = await this.getAnnualReport(year);
    const statistics = await this.getStatistics();

    return {
      generatedAt: new Date(),
      year,
      summary: {
        currentYearSpending: annualReport.totalSpending,
        projectedAnnualCost: statistics.totalYearlyCost,
        currentMonthlyCost: statistics.totalMonthlyCost,
        activeServices: statistics.active,
        totalServices: statistics.totalServices,
      },
      breakdown: {
        byCategory: annualReport.spendingByCategory,
        byProvider: annualReport.spendingByProvider,
        byMonth: annualReport.spendingByMonth,
      },
      renewals: {
        totalRenewals: annualReport.totalRenewals,
        upcomingRenewals: statistics.upcomingRenewals,
      },
    };
  }

  // Cron job to send renewal reminders (runs daily at 8 AM)
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async sendRenewalReminders() {
    console.log('Checking for services needing renewal reminders...');

    await this.updateStatuses();

    const now = new Date();
    const services = await this.subscriptionModel.find({ isActive: true });

    for (const service of services) {
      if (!service.sendReminder) continue;

      const daysUntilRenewal = Math.ceil(
        (service.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check if we should send reminder
      if (daysUntilRenewal === service.reminderDays) {
        // Check if we already sent reminder recently (within 24 hours)
        if (service.lastReminderSent) {
          const hoursSinceLastReminder =
            (now.getTime() - service.lastReminderSent.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastReminder < 24) continue;
        }

        // Send reminder email
        await this.sendReminderEmail(service, daysUntilRenewal);

        // Update last reminder sent
        service.lastReminderSent = now;
        await service.save();
      }
    }
  }

  private async sendReminderEmail(service: ServiceSubscription, daysUntilRenewal: number) {
    const subject = `⚠️ Service Renewal Reminder: ${service.serviceName}`;
    const message = `
      <h2>Service Renewal Reminder</h2>
      <p>The following service is due for renewal:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${service.serviceName}</h3>
        <p><strong>Provider:</strong> ${service.provider}</p>
        <p><strong>Category:</strong> ${service.category.replace(/_/g, ' ').toUpperCase()}</p>
        <p><strong>Renewal Date:</strong> ${service.renewalDate.toLocaleDateString()}</p>
        <p><strong>Days Until Renewal:</strong> ${daysUntilRenewal} days</p>
        <p><strong>Cost:</strong> ${service.currency} ${service.cost.toLocaleString()}</p>
        ${service.autoRenewal ? '<p><em>✓ Auto-renewal is enabled</em></p>' : '<p><strong>⚠️ Auto-renewal is NOT enabled - manual renewal required!</strong></p>'}
      </div>
      
      ${service.loginUrl ? `<p><strong>Login URL:</strong> <a href="${service.loginUrl}">${service.loginUrl}</a></p>` : ''}
      ${service.accountEmail ? `<p><strong>Account Email:</strong> ${service.accountEmail}</p>` : ''}
      ${service.notes ? `<p><strong>Notes:</strong> ${service.notes}</p>` : ''}
      
      <p>Please ensure this service is renewed before the expiration date.</p>
    `;

    try {
      // Send to admin email (you can customize this)
      await this.emailService.sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@cmdanigeria.net',
        subject,
        html: message,
      });
      console.log(`Renewal reminder sent for: ${service.serviceName}`);
    } catch (error) {
      console.error(`Failed to send reminder for ${service.serviceName}:`, error);
    }
  }

  /**
   * Send email with all expiring services and attached invoice PDF
   * @param recipientEmail - Email address to send to
   * @param daysAhead - Number of days to look ahead for expiring services (default: 30)
   */
  async sendExpiringServicesInvoice(
    recipientEmail?: string,
    daysAhead: number = 30,
  ): Promise<{ success: boolean; sentCount: number; message: string }> {
    await this.updateStatuses();

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // Get all services expiring within the specified days
    const expiringServices = await this.subscriptionModel
      .find({
        isActive: true,
        renewalDate: { $gte: now, $lte: futureDate },
        status: { $in: [ServiceStatus.ACTIVE, ServiceStatus.EXPIRING_SOON] },
      })
      .sort({ renewalDate: 1 })
      .exec();

    if (expiringServices.length === 0) {
      return {
        success: true,
        sentCount: 0,
        message: `No services expiring within the next ${daysAhead} days`,
      };
    }

    // Calculate totals
    const totals = { NGN: 0, USD: 0 };
    expiringServices.forEach((service) => {
      const currency = service.currency || 'NGN';
      totals[currency] += service.cost || 0;
    });

    // Generate invoice number
    const invoiceNumber = `INV-SVC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    // Generate invoice PDF
    const invoiceData: InvoiceData = {
      services: expiringServices,
      invoiceNumber,
      invoiceDate: now,
      dueDate: new Date(Math.min(...expiringServices.map((s) => s.renewalDate.getTime()))),
      totalAmount: totals,
    };

    const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(invoiceData);

    // Build email HTML
    const emailHtml = this.buildExpiringServicesEmailHtml(expiringServices, totals, daysAhead);

    // Send email with attachment - default to both cmdasec and ict emails
    const defaultEmails = ['cmdasec@gmail.com', 'ict@cmdanigeria.org'];
    const to = recipientEmail || defaultEmails;

    try {
      await this.mailerService.sendMail({
        to,
        subject: `🔔 Service Renewal Invoice - ${expiringServices.length} Service(s) Expiring Soon`,
        html: emailHtml,
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      console.log(`Expiring services invoice sent to ${Array.isArray(to) ? to.join(', ') : to} with ${expiringServices.length} services`);

      return {
        success: true,
        sentCount: expiringServices.length,
        message: `Invoice sent successfully to ${Array.isArray(to) ? to.join(', ') : to} with ${expiringServices.length} expiring service(s)`,
      };
    } catch (error) {
      console.error('Failed to send expiring services invoice:', error);
      return {
        success: false,
        sentCount: 0,
        message: `Failed to send invoice: ${error.message}`,
      };
    }
  }

  private buildExpiringServicesEmailHtml(
    services: ServiceSubscription[],
    totals: { NGN: number; USD: number },
    daysAhead: number,
  ): string {
    const serviceRows = services
      .map((service) => {
        const daysUntil = Math.ceil(
          (service.renewalDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        const urgencyColor = daysUntil <= 7 ? '#dc2626' : daysUntil <= 14 ? '#f59e0b' : '#059669';

        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${service.serviceName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${service.provider}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${service.renewalDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: ${urgencyColor}; font-weight: bold;">${daysUntil} days</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${service.currency || 'NGN'} ${(service.cost || 0).toLocaleString()}</td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6f1d46 0%, #994279 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 Service Renewal Notice</h1>
              <p style="color: #f3e8ff; margin: 10px 0 0 0; font-size: 14px;">CMDA Nigeria IT Services</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Dear Admin,
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                The following <strong>${services.length} service(s)</strong> are due for renewal within the next <strong>${daysAhead} days</strong>. 
                Please find the attached invoice for payment processing.
              </p>
              
              <!-- Summary Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-weight: bold;">⚠️ Action Required</p>
                <p style="margin: 10px 0 0 0; color: #78350f;">Please process payment before the renewal dates to avoid service interruption.</p>
              </div>
              
              <!-- Services Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin: 20px 0;">
                <thead>
                  <tr style="background-color: #009246;">
                    <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Service</th>
                    <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Provider</th>
                    <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Renewal Date</th>
                    <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 12px;">Days Left</th>
                    <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 12px;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${serviceRows}
                </tbody>
              </table>
              
              <!-- Totals -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #111827;">Payment Summary</h3>
                ${totals.NGN > 0 ? `<p style="margin: 5px 0; color: #374151;"><strong>Total (NGN):</strong> ₦${totals.NGN.toLocaleString()}</p>` : ''}
                ${totals.USD > 0 ? `<p style="margin: 5px 0; color: #374151;"><strong>Total (USD):</strong> $${totals.USD.toLocaleString()}</p>` : ''}
              </div>
              
              <!-- Payment Details -->
              <div style="background-color: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #065f46;">💳 Payment Details</h3>
                <p style="margin: 5px 0; color: #047857;"><strong>Account Name:</strong> Abawulor Dickson</p>
                <p style="margin: 5px 0; color: #047857;"><strong>Bank:</strong> United Bank for Africa (UBA)</p>
                <p style="margin: 5px 0; color: #047857;"><strong>Account Number:</strong> 2079456074</p>
                <p style="margin: 10px 0 0 0; color: #065f46; font-size: 12px;">
                  <em>Please send proof of payment to office@cmdanigeria.org after transfer.</em>
                </p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                📎 <strong>Attached:</strong> Invoice PDF for your records
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                CMDA Nigeria - Wholeness House Gwagwalada, FCT, Nigeria
              </p>
              <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">
                Email: office@cmdanigeria.org | Phone: +234 803 304 3290
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Get expiring services for preview (without sending email)
   */
  async getExpiringServicesPreview(daysAhead: number = 30) {
    await this.updateStatuses();

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const expiringServices = await this.subscriptionModel
      .find({
        isActive: true,
        renewalDate: { $gte: now, $lte: futureDate },
        status: { $in: [ServiceStatus.ACTIVE, ServiceStatus.EXPIRING_SOON] },
      })
      .sort({ renewalDate: 1 })
      .exec();

    const totals = { NGN: 0, USD: 0 };
    expiringServices.forEach((service) => {
      const currency = service.currency || 'NGN';
      totals[currency] += service.cost || 0;
    });

    return {
      services: expiringServices.map((s) => ({
        id: s._id,
        serviceName: s.serviceName,
        provider: s.provider,
        category: s.category,
        renewalDate: s.renewalDate,
        daysUntilRenewal: Math.ceil(
          (s.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
        cost: s.cost,
        currency: s.currency,
      })),
      totals,
      count: expiringServices.length,
    };
  }

  /**
   * Download invoice PDF for expiring services
   */
  async generateExpiringServicesInvoicePdf(daysAhead: number = 30): Promise<Buffer> {
    await this.updateStatuses();

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const expiringServices = await this.subscriptionModel
      .find({
        isActive: true,
        renewalDate: { $gte: now, $lte: futureDate },
        status: { $in: [ServiceStatus.ACTIVE, ServiceStatus.EXPIRING_SOON] },
      })
      .sort({ renewalDate: 1 })
      .exec();

    const totals = { NGN: 0, USD: 0 };
    expiringServices.forEach((service) => {
      const currency = service.currency || 'NGN';
      totals[currency] += service.cost || 0;
    });

    const invoiceNumber = `INV-SVC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    const invoiceData: InvoiceData = {
      services: expiringServices,
      invoiceNumber,
      invoiceDate: now,
      dueDate: expiringServices.length > 0
        ? new Date(Math.min(...expiringServices.map((s) => s.renewalDate.getTime())))
        : now,
      totalAmount: totals,
    };

    return this.invoicePdfService.generateInvoicePdf(invoiceData);
  }
}

