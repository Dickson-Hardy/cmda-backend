# PDF Receipt Download Implementation

## Overview
Users can now download PDF receipts for all subscription and donation transactions across all CMDA platforms.

## Backend Implementation

### Receipt Service
**File**: `src/subscriptions/receipt.service.ts`

- Generates branded PDF receipts using `pdfkit`
- Includes:
  - CMDA Nigeria branding and logo
  - Transaction details (reference, date, amount)
  - Member information (name, email, role, region)
  - Payment breakdown with currency formatting
  - Subscription/donation type details
  - Professional footer with contact information

### API Endpoint
**Endpoint**: `GET /subscriptions/:id/receipt`
**Controller**: `src/subscriptions/subscriptions.controller.ts`

- Requires authentication
- Returns PDF as binary stream
- Sets proper content headers:
  - Content-Type: `application/pdf`
  - Content-Disposition: `attachment; filename=CMDA-Receipt-{id}.pdf`

### Supported Transaction Types
- Regular subscriptions (monthly/annual)
- Lifetime memberships (gold/platinum/diamond)
- Vision partner donations
- One-time donations

## Frontend Implementation

### 1. CMDA-Frontend (User Dashboard)

#### Subscriptions Page
**File**: `src/components/DashboardComponents/Payments/Subscriptions.jsx`

- Added "Receipt" column with download button
- Downloads PDF with format: `CMDA-Receipt-{subscriptionId}.pdf`
- Shows user-friendly error messages

#### Donations Page
**File**: `src/components/DashboardComponents/Payments/Donations.jsx`

- Added "Receipt" column with download button
- Downloads PDF with format: `CMDA-Donation-Receipt-{donationId}.pdf`

### 2. CMDA-Admin (Admin Panel)

#### Subscriptions Page
**File**: `src/pages/Dashboard/Payments/Subscriptions.jsx`

- Added "Receipt" column to admin subscriptions table
- Admins can download receipts for any user transaction
- Uses toast notifications for error handling

#### Donations Page
**File**: `src/pages/Dashboard/Payments/Donations.jsx`

- Added "Receipt" column to donations table
- Allows admins to download donation receipts

### 3. CMDA-Mobile (Mobile App)

#### Subscription Screen
**File**: `screens/payments/SubscriptionScreen.tsx`

- Added "Receipt" column with PDF button
- Uses Expo FileSystem and Sharing APIs
- Downloads to device and offers sharing option
- Shows loading state while downloading

#### Donation Screen
**File**: `screens/payments/DonationScreen.tsx`

- Added "Receipt" column with PDF button
- Same mobile download experience as subscriptions
- Integrated with native sharing functionality

### 4. CMDA-MemberManager
No transaction history views exist in Member Manager, so no changes needed.

## Technical Details

### Web Implementation (React)
```javascript
const handleDownloadReceipt = async (id) => {
  const response = await fetch(
    `${import.meta.env.VITE_BASE_URL}/subscriptions/${id}/receipt`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CMDA-Receipt-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};
```

### Mobile Implementation (React Native/Expo)
```typescript
const handleDownloadReceipt = async (id: string, reference: string) => {
  const token = await getToken();
  const fileUri = `${FileSystem.documentDirectory}CMDA-Receipt-${reference}.pdf`;

  const downloadResumable = FileSystem.createDownloadResumable(
    `${baseUrl}/subscriptions/${id}/receipt`,
    fileUri,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const result = await downloadResumable.downloadAsync();
  
  if (result?.uri) {
    await Sharing.shareAsync(result.uri);
  }
};
```

## Dependencies Added

### Backend
- `pdfkit`: ^0.17.2
- `@types/pdfkit`: ^0.17.4

### Mobile
- `expo-file-system`: Already installed
- `expo-sharing`: Already installed

## User Experience

### Web Platforms
1. Navigate to Subscriptions or Donations page
2. Find the transaction in the history table
3. Click "Download PDF" button in the Receipt column
4. PDF downloads automatically with transaction-specific filename

### Mobile App
1. Navigate to Subscriptions or Donations screen
2. Find the transaction in the history table
3. Tap "PDF" button in the Receipt column
4. Choose to save or share the receipt via native share sheet

## Error Handling
- Network errors: User-friendly alert/toast messages
- Authentication errors: Returns 401, requires re-login
- Invalid transaction ID: Returns 404 with error message
- PDF generation errors: Caught and logged server-side

## Security
- All endpoints require valid JWT authentication
- Users can only download receipts for their own transactions
- Admins can download receipts for any user

## Testing Checklist
- [x] Backend PDF generation service
- [x] API endpoint returns proper PDF
- [ ] Frontend subscription receipt downloads
- [ ] Frontend donation receipt downloads
- [ ] Admin subscription receipt downloads
- [ ] Admin donation receipt downloads
- [ ] Mobile subscription receipt downloads
- [ ] Mobile donation receipt downloads
- [ ] Error handling for invalid IDs
- [ ] Authentication validation

## Future Enhancements
- Email receipt option
- Receipt preview before download
- Bulk receipt download for date ranges
- Receipt customization (include/exclude certain fields)
- Receipt templates for different transaction types
