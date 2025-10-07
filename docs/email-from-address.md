# Email "From" Address Configuration

## 📧 What Users Will See in Their Inbox

### Current Setup (Fallback Priority)

The system checks for the "From" address in this order:

```
1. RESEND_FROM_EMAIL  (if using Resend fallback)
   ↓ (if not set)
2. EMAIL_FROM         (your primary SMTP setting)
   ↓ (if not set)
3. "CMDA Nigeria <onboarding@resend.dev>"  (default fallback)
```

---

## 🎯 Recommended Configuration

### In Your `.env` File:

```env
# Primary SMTP "From" address (used by both primary and fallback)
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Optional: Override for Resend only
# RESEND_FROM_EMAIL=CMDA Nigeria <notifications@cmdanigeria.net>
```

### What Users See:

**In their inbox, the email will show:**
```
From: CMDA Nigeria <noreply@cmdanigeria.net>
To: user@example.com
Subject: Welcome to CMDA Nigeria
```

---

## ✉️ Email Examples

### Example 1: Welcome Email
```
From: CMDA Nigeria <noreply@cmdanigeria.net>
Subject: Welcome to CMDA Nigeria
```

### Example 2: Password Reset
```
From: CMDA Nigeria <noreply@cmdanigeria.net>
Subject: Password Reset Request
```

### Example 3: Verification Code
```
From: CMDA Nigeria <noreply@cmdanigeria.net>
Subject: Complete your CMDA Nigeria registration
```

---

## 🔧 Configuration Options

### Option 1: Same "From" Address for Both Services (RECOMMENDED)

```env
# Both primary SMTP and Resend will use this
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>
```

✅ **Pros:**
- Consistent branding
- Users always see the same sender
- Simple configuration

---

### Option 2: Different "From" Address for Each Service

```env
# Primary SMTP uses this
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Resend fallback uses this (overrides EMAIL_FROM when using Resend)
RESEND_FROM_EMAIL=CMDA Nigeria <alerts@cmdanigeria.net>
```

⚠️ **Use Case:**
- Track which service sent which email
- Different email addresses for different purposes

---

### Option 3: Using Resend's Test Email (FOR TESTING ONLY)

```env
# Don't set EMAIL_FROM or RESEND_FROM_EMAIL
# System will use: CMDA Nigeria <onboarding@resend.dev>
```

❌ **Only for testing!** Users will see `onboarding@resend.dev`

---

## 🚀 Setup for Production

### Step 1: Choose Your Email Address

Common options:
- `noreply@cmdanigeria.net` - Standard for automated emails
- `notifications@cmdanigeria.net` - For notifications/alerts
- `info@cmdanigeria.net` - If you want users to reply
- `office@cmdanigeria.net` - Professional/official

### Step 2: Update Your `.env` on Droplet

```bash
ssh root@64.23.254.48
nano /var/www/cmda-backend/.env
```

Add or update:
```env
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>
```

Save and restart:
```bash
pm2 restart all
```

### Step 3: Verify Domain in Resend (For Production)

**Why?** If you use `@cmdanigeria.net`, you need to verify you own the domain.

1. **Go to Resend Dashboard** → Domains
2. **Click "Add Domain"**
3. **Enter:** `cmdanigeria.net`
4. **Copy DNS Records** provided by Resend
5. **Add to your domain's DNS** (where you bought the domain)
   - SPF record
   - DKIM record
6. **Click "Verify"** in Resend (may take 5-30 minutes)

**DNS Records Example:**
```
Type: TXT
Name: resend._domainkey
Value: [long string provided by Resend]

Type: TXT  
Name: @
Value: v=spf1 include:resend.com ~all
```

---

## 📊 What Happens in Different Scenarios

### Scenario 1: Primary SMTP Works
```
User Request → Primary SMTP sends email
From: CMDA Nigeria <noreply@cmdanigeria.net> ← From EMAIL_FROM
Status: ✓ Sent via primary SMTP
```

### Scenario 2: Primary SMTP Fails, Resend Works
```
User Request → Primary SMTP fails (timeout)
            → Resend fallback sends email
From: CMDA Nigeria <noreply@cmdanigeria.net> ← From RESEND_FROM_EMAIL or EMAIL_FROM
Status: ✓ Sent via Resend fallback
```

### Scenario 3: Domain Not Verified in Resend (Testing)
```
User Request → Resend sends email
From: CMDA Nigeria <onboarding@resend.dev> ← Resend's test address
Status: ✓ Sent but shows test address
⚠️  Not recommended for production
```

---

## 🧪 Testing Different "From" Addresses

### Test 1: Check Current Configuration
```bash
# On your droplet
cd /var/www/cmda-backend
cat .env | grep -E "EMAIL_FROM|RESEND_FROM"
```

Should show:
```
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>
```

### Test 2: Send Test Email
```bash
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'
```

Check your inbox and look at the "From" field.

---

## 🎨 Customizing the Display Name

### Format Options:

```env
# Option 1: Name + Email (RECOMMENDED)
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>
# Users see: "CMDA Nigeria <noreply@cmdanigeria.net>"

# Option 2: Just Email
EMAIL_FROM=noreply@cmdanigeria.net
# Users see: "noreply@cmdanigeria.net"

# Option 3: Different Display Name
EMAIL_FROM=CMDA Support Team <noreply@cmdanigeria.net>
# Users see: "CMDA Support Team <noreply@cmdanigeria.net>"
```

---

## ⚠️ Common Issues

### Issue 1: Emails Go to Spam
**Cause:** Domain not verified in Resend
**Fix:**
1. Verify domain in Resend dashboard
2. Add SPF and DKIM records to DNS
3. Wait 30 minutes for DNS propagation

### Issue 2: "From" Shows Wrong Address
**Cause:** Multiple EMAIL_FROM definitions or typo
**Fix:**
```bash
# Check for duplicates
cat .env | grep EMAIL_FROM

# Should only show once:
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Restart to apply
pm2 restart all --update-env
```

### Issue 3: Using Test Address in Production
**Cause:** Domain not verified, using default
**Fix:** Verify your domain in Resend dashboard

---

## 📋 Quick Setup Checklist

- [ ] Choose email address (e.g., `noreply@cmdanigeria.net`)
- [ ] Add `EMAIL_FROM` to `.env`
- [ ] Verify domain in Resend dashboard
- [ ] Add DNS records (SPF, DKIM)
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Test with real email
- [ ] Check inbox - should show correct "From" address
- [ ] Check spam folder - should be in inbox, not spam

---

## 🎯 Recommended Final Configuration

```env
# Primary SMTP Settings
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=465
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Resend Fallback
RESEND_API_KEY=re_your_api_key
# RESEND_FROM_EMAIL not needed - will use EMAIL_FROM
```

**Result:** All emails (primary and fallback) will show:
```
From: CMDA Nigeria <noreply@cmdanigeria.net>
```

This gives you consistent branding and professional appearance! 🎉
