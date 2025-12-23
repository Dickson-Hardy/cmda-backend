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

    // Get currency symbol - using HTML entity for Naira to avoid encoding issues
    const currencySymbol = isGlobal ? '$' : '&#8358;';

    // Set receipt title based on payment type
    const receiptTitle = 'DONATION RECEIPT';

    // Set address and contact based on location
    const address = isGlobal
      ? {
          street: '1928 Woodlawn Drive,',
          city: 'Woodlawn, Maryland, 21207.',
          phone: '+1 (443) 557 4199',
          email: 'give@cmdanigeriaglobal.org,',
          email2: 'info@cmdanigeriaglobal.org',
          orgName:
            'CHRISTIAN MEDICAL<br>AND DENTAL ASSOCIATION<br>OF NIGERIA GLOBAL NETWORK<br>(CMDA NIGERIA-GLOBAL NETWORK)',
        }
      : {
          street: 'Wholeness House Gwagwalada,',
          city: 'FCT, Nigeria.',
          phone: '+234 809 153 3339',
          email: 'office@cmdanigeria.org,',
          email2: 'info@cmdanigeria.org',
          orgName: 'CHRISTIAN MEDICAL<br>AND DENTAL ASSOCIATION<br>OF NIGERIA<br>(CMDA NIGERIA)',
        };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMDA Donation Receipt - ${donation.reference || donationId}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Montserrat', 'Nunito', Arial, sans-serif;
      background: #fff;
      padding: 24px;
      line-height: 1.35;
    }
    .receipt-container {
      max-width: 820px;
      margin: 0 auto;
      background: #fff;
      padding: 0;
      border: 1px solid #e0e0e0;
    }
    .top-bar {
      height: 24px;
      background: #6f1d46;
      width: 100%;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 32px 34px 18px 34px;
      gap: 24px;
    }
    .header-left h1 {
      font-size: 46px;
      font-weight: 900;
      color: #111;
      letter-spacing: 0px;
      margin-bottom: 26px;
      line-height: 1;
    }
    .field-row {
      font-size: 20px;
      font-weight: 700;
      color: #111;
      margin-bottom: 10px;
    }
    .field-label {
      font-weight: 800;
      margin-right: 8px;
    }
    .underline {
      display: inline-block;
      min-width: 220px;
      border-bottom: 2px solid #000;
      padding-bottom: 4px;
    }
    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
    }
    .org-name {
      font-size: 11px;
      font-weight: 800;
      color: #111;
      line-height: 1.45;
      max-width: 210px;
      text-align: center;
    }
    .logo-container {
      width: 82px;
      height: 82px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #b5b5b5;
      border-radius: 4px;
      padding: 8px;
      background: #fafafa;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .payee-section {
      padding: 0 34px 8px 34px;
    }
    .payee-title {
      font-size: 28px;
      font-weight: 900;
      color: #111;
      margin-bottom: 8px;
      letter-spacing: 0.4px;
    }
    .payee-name {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      margin-bottom: 6px;
    }
    .payee-email {
      font-size: 22px;
      font-weight: 800;
      color: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px auto 16px auto;
    }
    thead {
      background: #009246;
    }
    thead th {
      color: #fff;
      padding: 14px 12px;
      text-align: center;
      font-weight: 800;
      font-size: 17px;
    }
    tbody td {
      padding: 16px 14px;
      border: 1px solid #c1c1c1;
      font-size: 19px;
      font-weight: 700;
      color: #111;
      text-align: center;
    }
    .table-wrapper {
      padding: 0 24px;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 26px 34px 12px 34px;
      gap: 32px;
    }
    .thank-you {
      font-size: 42px;
      font-weight: 900;
      color: #111;
      margin-bottom: 18px;
      letter-spacing: 0.2px;
    }
    .contact-info {
      font-size: 14px;
      color: #111;
      line-height: 1.85;
      font-weight: 700;
      max-width: 360px;
    }
    .total-box {
      border: 1.8px solid #2c2c2c;
      background: #efebe7;
      padding: 16px 24px;
      min-width: 260px;
      text-align: center;
      align-self: flex-start;
    }
    .total-label {
      font-size: 22px;
      font-weight: 800;
      color: #111;
      margin-bottom: 6px;
    }
    .total-amount {
      font-size: 40px;
      font-weight: 900;
      color: #111;
      letter-spacing: -0.4px;
    }
    .signature-block {
      display: flex;
      justify-content: flex-end;
      padding: 14px 34px 6px 34px;
      margin-top: 10px;
    }
    .signature-inner {
      width: 340px;
      text-align: center;
    }
    .signature-line {
      border-bottom: 1.8px solid #2c2c2c;
      padding-top: 38px;
      margin-bottom: 8px;
    }
    .signature-name {
      font-size: 19px;
      font-weight: 800;
      color: #111;
      font-style: italic;
    }
    .bottom-bars {
      margin-top: 20px;
    }
    .bottom-green {
      height: 24px;
      background: #009246;
    }
    .bottom-purple {
      height: 24px;
      background: #6f1d46;
    }
    @media print {
      body { padding: 0; background: #fff; }
      .receipt-container { border: none; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="top-bar"></div>

    <div class="header">
      <div class="header-left">
        <h1>${receiptTitle}</h1>
        <div class="field-row"><span class="field-label">Date:</span><span class="underline">${transactionDate}</span></div>
        <div class="field-row"><span class="field-label">No. Invoice :</span><span class="underline">${donation.reference || donation._id.toString().substring(0, 8).toUpperCase()}</span></div>
      </div>
      <div class="header-right">
        <div class="org-name">${address.orgName}</div>
        <div class="logo-container">
          <img src="https://cmdanigeria.net/CMDALogo.svg" alt="CMDA Logo">
        </div>
      </div>
    </div>

    <div class="payee-section">
      <div class="payee-title">PAYEE DETAILS</div>
      <div class="payee-name">${userData.fullName}</div>
      <div class="payee-email">${userData.email}</div>
    </div>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Item Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            donation.areasOfNeed && donation.areasOfNeed.length > 0
              ? donation.areasOfNeed
                  .map(
                    (area) => `
          <tr>
            <td>${shortDate}</td>
            <td style="text-align:left; padding-left:24px;">${area.name}</td>
            <td style="text-align:right; padding-right:28px;">${currencySymbol} ${area.amount.toLocaleString()}</td>
          </tr>
          `,
                  )
                  .join('')
              : `
          <tr>
            <td>${shortDate}</td>
            <td style="text-align:left; padding-left:24px;">Donations</td>
            <td style="text-align:right; padding-right:28px;">${currencySymbol} ${donation.totalAmount.toLocaleString()}</td>
          </tr>
          `
          }
          <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div>
        <div class="thank-you">THANK YOU!</div>
        <div class="contact-info">
          Address - ${address.street}<br>
          ${address.city}<br>
          Phone - ${address.phone}<br>
          Email- ${address.email}<br>
          ${address.email2}
        </div>
      </div>
      <div class="total-box">
        <div class="total-label">Total:</div>
        <div class="total-amount">${currencySymbol} ${donation.totalAmount.toLocaleString()}</div>
      </div>
    </div>

    <div class="signature-block">
      <div class="signature-inner">
        <div class="signature-line"></div>
        <div class="signature-name">Dr. Jane Uche-Ejekwu</div>
      </div>
    </div>

    <div class="bottom-bars">
      <div class="bottom-green"></div>
      <div class="bottom-purple"></div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
