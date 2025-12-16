import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subscription } from './subscription.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class ReceiptHtmlService {
  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceiptHtml(subscriptionId: string): Promise<string> {
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
      month: 'long',
      year: 'numeric',
    });

    const expiryDate = subscription.expiryDate
      ? new Date(subscription.expiryDate).toLocaleDateString('en-GB')
      : 'N/A';

    const status = subscription.isPaid ? 'PAID' : 'PENDING';
    const statusColor = subscription.isPaid ? '#10B981' : '#F59E0B';
    const statusBg = subscription.isPaid ? '#D1FAE5' : '#FEF3C7';

    const description = this.getSubscriptionDescription(subscription);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMDA Receipt - ${subscription.reference || subscriptionId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f3f4f6;
      padding: 20px;
      line-height: 1.6;
    }
    .receipt-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border: 3px solid #994279;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #994279;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #994279;
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .header p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .receipt-title {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      color: #000;
      margin: 20px 0;
    }
    .section {
      margin: 25px 0;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #994279;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #E8D4E0;
    }
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .detail-label {
      font-weight: 600;
      color: #333;
      min-width: 180px;
    }
    .detail-value {
      color: #666;
      flex: 1;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      background: ${statusBg};
      color: ${statusColor};
    }
    .amount-box {
      background: #994279;
      color: white;
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      margin: 30px 0;
    }
    .amount-box .label {
      font-size: 16px;
      margin-bottom: 10px;
    }
    .amount-box .amount {
      font-size: 36px;
      font-weight: bold;
    }
    .thank-you {
      text-align: center;
      margin: 30px 0;
    }
    .thank-you h3 {
      color: #994279;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .thank-you p {
      color: #666;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      border-top: 2px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 30px;
      color: #6b7280;
      font-size: 12px;
    }
    .footer p {
      margin: 8px 0;
    }
    .print-button {
      text-align: center;
      margin: 20px 0;
    }
    .print-button button {
      background: #994279;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      font-weight: 600;
    }
    .print-button button:hover {
      background: #7a345f;
    }
    @media print {
      body { background: white; padding: 0; }
      .receipt-container { border: 2px solid #994279; box-shadow: none; }
      .print-button { display: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <h1>CMDA NIGERIA</h1>
      <p>Christian Medical & Dental Association of Nigeria</p>
      <p>Website: www.cmdanigeria.net</p>
      <p>Email: office@cmdanigeria.org | Phone: +234 803 304 3290</p>
    </div>

    <div class="receipt-title">PAYMENT RECEIPT</div>

    <div class="section">
      <div class="section-title">Transaction Information</div>
      <div class="detail-row">
        <div class="detail-label">Receipt Number:</div>
        <div class="detail-value">${subscription.reference || subscription._id.toString()}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Transaction Date:</div>
        <div class="detail-value">${transactionDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Payment Method:</div>
        <div class="detail-value">${subscription.source || 'Online Payment'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Payment Status:</div>
        <div class="detail-value"><span class="status-badge">${status}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Member Information</div>
      <div class="detail-row">
        <div class="detail-label">Full Name:</div>
        <div class="detail-value">${userData.fullName}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Member ID:</div>
        <div class="detail-value">${userData.membershipId}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Email:</div>
        <div class="detail-value">${userData.email}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Member Type:</div>
        <div class="detail-value">${userData.role}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Region/Chapter:</div>
        <div class="detail-value">${userData.region}</div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Payment Details</div>
      <div class="detail-row">
        <div class="detail-label">Description:</div>
        <div class="detail-value">${description}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Subscription Period:</div>
        <div class="detail-value">${subscription.frequency}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Expiry Date:</div>
        <div class="detail-value">${expiryDate}</div>
      </div>
    </div>

    <div class="amount-box">
      <div class="label">TOTAL AMOUNT PAID</div>
      <div class="amount">${subscription.currency} ${subscription.amount.toLocaleString()}</div>
    </div>

    <div class="thank-you">
      <h3>Thank you for your payment!</h3>
      <p>Your support helps CMDA Nigeria fulfill its mission of serving God through healthcare ministry.</p>
    </div>

    <div class="print-button">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>

    <div class="footer">
      <p><strong>This is a computer-generated receipt and does not require a signature.</strong></p>
      <p>For inquiries, please contact: office@cmdanigeria.org or call +234 803 304 3290</p>
      <p>Receipt generated on: ${new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</p>
    </div>
  </div>
</body>
</html>
    `.trim();
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
