# Admin-Created Member Password Change Flow

## Overview
This document explains the authentication flow for members created by admins, including automatic verification and password change requirements.

## Flow Description

### 1. Member Creation by Admin
When an admin creates a new member via the Admin panel:
- Member account is created with a temporary password (`Cmda24@` + random 5-character code)
- `requirePasswordChange: true` is set on the user account
- `isVerified: true` is set automatically (no email verification needed)
- `createdByAdmin: true` flag is set for tracking
- Credentials are sent to the member's email address

**Location**: `CMDA-Backend/src/admin/admin.service.ts` (line 224-233)

### 2. Member First Login
When a member created by admin attempts to login:
- They use their email and the temporary password received
- The login response includes `requirePasswordChange: true` flag
- Member Manager frontend checks this flag
- If true, user is redirected to `/change-password` page
- They cannot access the dashboard until password is changed

**Locations**:
- Backend: `CMDA-Backend/src/auth/auth.service.ts` (line 119-135)
- Frontend: `CMDA-MemberManager/src/pages/Auth/Login.jsx` (line 21-35)

### 3. Password Change
When the member changes their password:
- Old password (temporary) must be provided
- New password must be confirmed
- After successful change:
  - `requirePasswordChange: false` is set
  - `initialPasswordChanged: true` is set
  - `initialPasswordChangedAt: Date` is recorded
  - `isVerified: true` is set (if not already verified)
- Member is now fully activated and can access the dashboard

**Location**: `CMDA-Backend/src/auth/auth.service.ts` (line 320-351)

## Key Differences from Regular Members

| Feature | Admin-Created Members | Regular Members |
|---------|----------------------|-----------------|
| Email Verification | Auto-verified (no email) | Must verify via email code |
| Initial Password | Set by system | Set by user |
| First Login | Must change password | Can use immediately |
| Verification Status | Automatically verified on creation | Verified after email confirmation |
| Password Change Tracking | Tracked via `initialPasswordChanged` | Not tracked |

## API Endpoints

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "member@example.com",
  "password": "Cmda24@ABC12"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ...userObject },
    "accessToken": "jwt-token",
    "requirePasswordChange": true
  }
}
```

### Change Password
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "oldPassword": "Cmda24@ABC12",
  "newPassword": "MyNewPassword123!",
  "confirmPassword": "MyNewPassword123!"
}

Response:
{
  "success": true,
  "message": "Password changed successfully"
}
```

## Database Schema Fields

### User Schema
```typescript
{
  requirePasswordChange: Boolean,      // Force password change flag
  isVerified: Boolean,                // Email verification status
  createdByAdmin: Boolean,            // Member created by admin
  createdByAdminId: String,           // Admin who created the member
  initialPasswordChanged: Boolean,    // First password change completed
  initialPasswordChangedAt: Date,     // Timestamp of first change
  credentialEmailOpened: Boolean,     // Tracking if credentials email was opened
  credentialEmailOpenedAt: Date,      // Timestamp of email open
}
```

## Frontend Routes

### Member Manager Application
- `/login` - Login page (public)
- `/change-password` - Password change page (protected, accessible even if requirePasswordChange is true)
- `/` - Dashboard (protected, requires password to be changed)

## Testing Checklist

- [ ] Admin creates a new member
- [ ] Member receives credentials email
- [ ] Member logs in with temporary password
- [ ] Member is redirected to password change page
- [ ] Member cannot access dashboard before changing password
- [ ] Member successfully changes password
- [ ] Member is automatically verified after password change
- [ ] Member can now access dashboard
- [ ] No email verification is required for admin-created members

## Fixes Applied (January 2025)

### Issue
Members created by admin were receiving email verification requests instead of being auto-verified and prompted to change password.

### Root Cause
1. `isVerified` was not being set to `true` on member creation
2. Frontend was calling wrong API endpoint (`/member-manager/auth/login` instead of `/auth/login`)
3. Password change logic wasn't setting `isVerified: true`
4. Login response structure wasn't being read correctly

### Solutions
1. **Backend (admin.service.ts)**: Added `isVerified: true` to member creation
2. **Backend (auth.service.ts)**: Added `isVerified: true` in password change logic when admin-created user changes initial password
3. **Frontend (authApi.js)**: Changed login endpoint from `/member-manager/auth/login` to `/auth/login`
4. **Frontend (Login.jsx)**: Fixed password change check to use `result.requirePasswordChange` instead of `result.user?.requirePasswordChange`

## Related Files
- `CMDA-Backend/src/admin/admin.service.ts`
- `CMDA-Backend/src/auth/auth.service.ts`
- `CMDA-Backend/src/auth/auth.controller.ts`
- `CMDA-Backend/src/users/schema/users.schema.ts`
- `CMDA-MemberManager/src/pages/Auth/Login.jsx`
- `CMDA-MemberManager/src/pages/Auth/ChangePassword.jsx`
- `CMDA-MemberManager/src/redux/api/authApi.js`
- `CMDA-MemberManager/src/App.jsx`
