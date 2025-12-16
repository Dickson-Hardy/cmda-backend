import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Donation } from './donation.schema';
import { User } from '../users/schema/users.schema';

@Injectable()
export class DonationReceiptHtmlService {
  constructor(
    @InjectModel(Donation.name) private donationModel: Model<Donation>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateReceiptHtml(donationId: string): Promise<string> {
    const donation = await this.donationModel.findById(donationId).populate('user').exec();

    if (!donation) {
      throw new Error('Donation not found');
    }

    const user = (donation.user as any) || {};
    const userData = {
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
      email: user.email || 'N/A',
      role: user.role || 'N/A',
      membershipId: user.membershipId || 'N/A',
      region: user.region || 'N/A',
    };

    const transactionDate = new Date((donation as any).createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const status = donation.isPaid ? 'PAID' : 'PENDING';
    const statusColor = donation.isPaid ? '#10B981' : '#F59E0B';
    const statusBg = donation.isPaid ? '#D1FAE5' : '#FEF3C7';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMDA Donation Receipt - ${donation.reference || donationId}</title>
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
    .donation-badge {
      text-align: center;
      margin: 20px 0;
    }
    .donation-badge span {
      background: #10B981;
      color: white;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
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
    .tax-info {
      background: #FEF3C7;
      border: 2px solid #F59E0B;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      text-align: center;
    }
    .tax-info p {
      color: #92400E;
      font-size: 13px;
      margin: 5px 0;
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

    <div class="receipt-title">DONATION RECEIPT</div>

    <div class="donation-badge">
      <span>🙏 CHARITABLE DONATION</span>
    </div>

    <div class="section">
      <div class="section-title">Transaction Information</div>
      <div class="detail-row">
        <div class="detail-label">Receipt Number:</div>
        <div class="detail-value">${donation.reference || donation._id.toString()}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Transaction Date:</div>
        <div class="detail-value">${transactionDate}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Payment Method:</div>
        <div class="detail-value">${donation.source || 'Online Payment'}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Payment Status:</div>
        <div class="detail-value"><span class="status-badge">${status}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Donor Information</div>
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
      <div class="section-title">Donation Details</div>
      <div class="detail-row">
        <div class="detail-label">Recurring:</div>
        <div class="detail-value">${donation.recurring ? 'Yes' : 'No'}</div>
      </div>
      ${
        donation.frequency
          ? `
      <div class="detail-row">
        <div class="detail-label">Frequency:</div>
        <div class="detail-value">${donation.frequency}</div>
      </div>
      `
          : ''
      }
      ${
        donation.areasOfNeed && donation.areasOfNeed.length > 0
          ? `
      <div class="detail-row">
        <div class="detail-label">Areas of Need:</div>
        <div class="detail-value">${donation.areasOfNeed.map((area) => `${area.name}: ${donation.currency || 'NGN'} ${area.amount.toLocaleString()}`).join(', ')}</div>
      </div>
      `
          : ''
      }
    </div>

    <div class="amount-box">
      <div class="label">TOTAL DONATION AMOUNT</div>
      <div class="amount">${donation.currency || 'NGN'} ${donation.totalAmount.toLocaleString()}</div>
    </div>

    <div class="tax-info">
      <p><strong>Tax Information</strong></p>
      <p>This donation receipt may be used for tax purposes where applicable.</p>
      <p>Please consult with your tax advisor for specific eligibility requirements.</p>
    </div>

    <div class="thank-you">
      <h3>Thank you for your generous donation!</h3>
      <p>Your support enables CMDA Nigeria to continue its mission of serving God through healthcare ministry.</p>
      <p>May God bless you abundantly for your generosity.</p>
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
}
