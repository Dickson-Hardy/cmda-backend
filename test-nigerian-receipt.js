const fs = require('fs');
const path = require('path');

// Mock donation data - Nigerian version
const mockDonation = {
  _id: '507f1f77bcf86cd799439011',
  reference: 'DON-2024-002',
  totalAmount: 150000,
  currency: 'NGN', // Nigerian Naira
  isPaid: true,
  source: 'Paystack',
  recurring: false,
  frequency: null,
  areasOfNeed: [
    { name: 'Donations', amount: 100000 },
    { name: 'Dues', amount: 30000 },
    { name: '6JNC', amount: 20000 },
  ],
  createdAt: '2024-02-01T10:00:00Z',
};

// Mock user data
const mockUser = {
  firstName: 'Chidi',
  lastName: 'Okafor',
  fullName: 'Chidi Okafor',
  email: 'chidi.okafor@example.com',
  role: 'Member',
  membershipId: 'CMDA-NG-2024-001',
  region: 'Lagos',
};

// Format date
const transactionDate = new Date(mockDonation.createdAt).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const shortDate = new Date(mockDonation.createdAt).toLocaleDateString('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

const status = mockDonation.isPaid ? 'PAID' : 'PENDING';
const statusColor = mockDonation.isPaid ? '#10B981' : '#F59E0B';
const statusBg = mockDonation.isPaid ? '#D1FAE5' : '#FEF3C7';

// Determine if payment is global or Nigerian
const isGlobal = mockDonation.currency === 'USD' || mockDonation.currency === '$';

// Set receipt title based on payment type
const receiptTitle = 'DONATION RECIEPT';

// Set address and contact based on location
const address = isGlobal
  ? {
      street: '1928 Woodlawn Drive,',
      city: 'Woodlawn, Maryland, 21207.',
      phone: '+1 (443) 557 4199',
      email: 'give@cmdanigeriaglobal.org,',
      email2: 'info@cmdanigeriaglobal.org',
      orgName:
        'CHRISTIAN MEDICAL<br>ANDDENTAL ASSOCIATION<br>OF NIGERIA GLOBAL NETWORK<br>(CMDA NIGERIA-GLOBAL NETWORK)',
    }
  : {
      street: 'Wholeness House Gwagwalada,',
      city: 'FCT, Nigeria.',
      phone: '+234 803 304 3290',
      email: 'office@cmdanigeria.org,',
      email2: 'info@cmdanigeria.org',
      orgName: 'CHRISTIAN MEDICAL<br>AND DENTAL ASSOCIATION<br>OF NIGERIA<br>(CMDA NIGERIA)',
    };

// Generate HTML
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CMDA Donation Receipt - ${mockDonation.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial Black', 'Arial Bold', 'Arial', sans-serif;
      background: white;
      padding: 20px;
      line-height: 1.2;
    }
    .receipt-container {
      max-width: 768px;
      margin: 0 auto;
      background: white;
      padding: 0;
    }
    .purple-bar {
      background: #7B2869;
      height: 20px;
      margin-bottom: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding: 0 20px;
    }
    .header-left h1 {
      font-size: 52px;
      font-weight: 900;
      color: #000;
      margin-bottom: 28px;
      letter-spacing: 0px;
      line-height: 0.95;
    }
    .header-left .date,
    .header-left .invoice {
      font-size: 22px;
      font-weight: 700;
      color: #000;
      margin-bottom: 10px;
      line-height: 1.2;
    }
    .header-right {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    .org-name {
      font-size: 10px;
      font-weight: 700;
      color: #000;
      line-height: 1.35;
      margin-bottom: 10px;
      text-align: right;
      max-width: 185px;
    }
    .logo-container {
      width: 95px;
      height: 95px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8f8f8;
      border: 1.5px solid #ccc;
      border-radius: 3px;
      padding: 10px;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .payee-section {
      margin-bottom: 32px;
      padding: 0 20px;
    }
    .payee-title {
      font-size: 28px;
      font-weight: 900;
      color: #000;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }
    .payee-name {
      font-size: 23px;
      font-weight: 700;
      color: #000;
      margin-bottom: 6px;
    }
    .payee-email {
      font-size: 23px;
      font-weight: 700;
      color: #000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 45px;
    }
    thead {
      background: #2D8A5B;
    }
    thead th {
      color: white;
      padding: 16px 20px;
      text-align: left;
      font-weight: 700;
      font-size: 19px;
    }
    tbody td {
      padding: 16px 20px;
      border: 1px solid #c8c8c8;
      font-size: 21px;
      font-weight: 600;
      color: #000;
    }
    tbody tr:last-child td {
      border-bottom: 1px solid #c8c8c8;
    }
    .footer-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-top: 55px;
      padding: 0 20px;
      gap: 50px;
    }
    .footer-left {
      flex: 1;
    }
    .thank-you {
      font-size: 50px;
      font-weight: 900;
      color: #000;
      margin-bottom: 22px;
      letter-spacing: -0.3px;
    }
    .contact-info {
      font-size: 13.5px;
      color: #000;
      line-height: 1.85;
      font-weight: 600;
    }
    .contact-info strong {
      font-weight: 800;
    }
    .total-box {
      border: 2.5px solid #000;
      padding: 22px 40px;
      text-align: center;
      min-width: 310px;
      align-self: flex-start;
    }
    .total-label {
      font-size: 24px;
      font-weight: 700;
      color: #000;
      margin-bottom: 10px;
    }
    .total-amount {
      font-size: 52px;
      font-weight: 900;
      color: #000;
      letter-spacing: -0.8px;
    }
    .signature-section {
      text-align: right;
      margin-top: 48px;
      padding: 0 40px;
    }
    .signature-line {
      border-bottom: 2.5px solid #000;
      width: 330px;
      margin: 0 0 10px auto;
      padding-top: 48px;
    }
    .signature-name {
      font-size: 21px;
      font-weight: 400;
      color: #000;
      font-style: italic;
      font-family: 'Brush Script MT', cursive, 'Arial';
    }
    .purple-bar-bottom {
      background: #7B2869;
      height: 20px;
      margin-top: 50px;
    }
    @media print {
      body { padding: 0; background: white; }
      .receipt-container { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="purple-bar"></div>
    
    <div class="header">
      <div class="header-left">
        <h1>${receiptTitle}</h1>
        <div class="date">Date:${transactionDate}</div>
        <div class="invoice">No. Invoice : ${mockDonation.reference}</div>
      </div>
      <div class="header-right">
        <div class="org-name">
          ${address.orgName}
        </div>
        <div class="logo-container">
          <img src="https://cmdanigeria.net/CMDALogo.svg" alt="CMDA Logo">
        </div>
      </div>
    </div>

    <div class="payee-section">
      <div class="payee-title">PAYEE DETAILS</div>
      <div class="payee-name">${mockUser.fullName}</div>
      <div class="payee-email">${mockUser.email}</div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Item Description</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${mockDonation.areasOfNeed
          .map(
            (area) => `
        <tr>
          <td>${shortDate}</td>
          <td>${area.name}</td>
          <td>${mockDonation.currency} ${area.amount.toLocaleString()}</td>
        </tr>
        `,
          )
          .join('')}
        <tr>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <div class="footer-section">
      <div class="footer-left">
        <div class="thank-you">THANK YOU!</div>
        <div class="contact-info">
          <strong>Address</strong> - ${address.street}<br>
          ${address.city}<br>
          <strong>Phone</strong> -${address.phone}<br>
          <strong>Email</strong>- ${address.email}<br>
          ${address.email2}
        </div>
      </div>
      <div class="total-box">
        <div class="total-label">Total:</div>
        <div class="total-amount">${mockDonation.currency} ${mockDonation.totalAmount.toLocaleString()}</div>
      </div>
    </div>

    <div class="signature-section">
      <div class="signature-line"></div>
      <div class="signature-name">Dr. Jane Uche-Ejekwu</div>
    </div>

    <div class="purple-bar-bottom"></div>
  </div>
</body>
</html>
`;

// Write to file
const outputPath = path.join(__dirname, 'test-nigerian-receipt.html');
fs.writeFileSync(outputPath, html, 'utf8');

console.log('✅ Nigerian Receipt generated successfully!');
console.log('📄 File saved to:', outputPath);
console.log('🌐 Open the file in your browser to view the Nigerian version');
console.log('');
console.log('📋 Details:');
console.log('   Currency: NGN');
console.log('   Address: Wholeness House Gwagwalada, FCT, Nigeria');
console.log('   Organization: CMDA NIGERIA');
