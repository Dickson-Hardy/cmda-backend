# Email Fallback Setup Guide

## Quick Fallback Options

When your primary SMTP email service fails, you need a reliable fallback. Here are the **best options ranked by ease of setup**:

### 🥇 Option 1: Resend (RECOMMENDED - Fastest Setup)

**Why Resend:**
- ✅ Free tier: 100 emails/day, 3,000/month
- ✅ Setup time: **2 minutes**
- ✅ No credit card required for free tier
- ✅ Built for developers
- ✅ Better deliverability than SMTP
- ✅ Simple API (just API key, no SMTP config)

**Setup Steps:**

1. **Sign up at [resend.com](https://resend.com)**

2. **Get your API key:**
   - Go to API Keys section
   - Create new API key
   - Copy the key (starts with `re_`)

3. **Add to .env:**
   ```env
   # Fallback Email (Resend)
   RESEND_API_KEY=re_your_api_key_here
   ```

4. **Install package:**
   ```bash
   npm install resend
   # or
   pnpm add resend
   ```

5. **Verify domain (for production):**
   - Add domain in Resend dashboard
   - Add DNS records (takes 5 minutes)
   - For testing, you can use `onboarding@resend.dev`

---

### 🥈 Option 2: Brevo (formerly Sendinblue)

**Why Brevo:**
- ✅ Free tier: 300 emails/day
- ✅ SMTP + API available
- ✅ Good for international emails
- ✅ Marketing features included

**Setup Steps:**

1. **Sign up at [brevo.com](https://www.brevo.com)**

2. **Get SMTP credentials:**
   - Go to SMTP & API → SMTP
   - Copy credentials

3. **Add to .env:**
   ```env
   # Fallback Email (Brevo)
   BREVO_SMTP_HOST=smtp-relay.brevo.com
   BREVO_SMTP_PORT=587
   BREVO_SMTP_USER=your-email@domain.com
   BREVO_SMTP_PASS=your-smtp-key
   ```

---

### 🥉 Option 3: Mailgun

**Why Mailgun:**
- ✅ Free tier: 5,000 emails/month for 3 months
- ✅ Great deliverability
- ✅ Popular choice

**Setup Steps:**

1. **Sign up at [mailgun.com](https://www.mailgun.com)**

2. **Get API credentials:**
   - Go to Sending → Domain settings
   - Copy SMTP credentials

3. **Add to .env:**
   ```env
   # Fallback Email (Mailgun)
   MAILGUN_SMTP_HOST=smtp.mailgun.org
   MAILGUN_SMTP_PORT=587
   MAILGUN_SMTP_USER=postmaster@your-domain.mailgun.org
   MAILGUN_SMTP_PASS=your-smtp-password
   ```

---

## Implementation

I've already created the fallback implementation. Here's what it does:

### Automatic Fallback Logic

```typescript
1. Try primary email service (your current SMTP)
   ↓ (if fails after 45s)
2. Try Resend API
   ↓ (if Resend fails)
3. Log error and return gracefully
```

### Files Created

1. **`src/email/resend-fallback.service.ts`** - Resend fallback service
2. **Updated `email.module.ts`** - Integrated fallback
3. **Updated `email.service.ts`** - Uses fallback automatically

---

## Testing the Fallback

### Test 1: Resend Setup

```bash
# On your droplet
cd /var/www/cmda-backend

# Add RESEND_API_KEY to .env
nano .env

# Add this line:
# RESEND_API_KEY=re_your_key_here

# Install resend package
npm install resend

# Rebuild
npm run build

# Restart
pm2 restart all

# Test
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'
```

### Test 2: Force Fallback

To test that fallback works when primary fails:

```bash
# Temporarily break primary SMTP by changing password in .env
EMAIL_PASS=wrong_password

# Restart
pm2 restart all

# Test - should use Resend
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@gmail.com"}'

# Check logs - should see "Primary email failed, trying Resend fallback"
pm2 logs | grep -i fallback

# Restore correct password
EMAIL_PASS=correct_password
pm2 restart all
```

---

## Cost Comparison (Free Tiers)

| Provider | Free Tier | Best For |
|----------|-----------|----------|
| **Resend** | 3,000/month | Quick setup, developers |
| **Brevo** | 9,000/month | Higher volume |
| **Mailgun** | 5,000/month (3 months) | Temporary solution |
| **SendGrid** | 100/day forever | Long-term free option |
| **AWS SES** | 62,000/month (if in EC2) | AWS users |

---

## Recommended Setup

### For Production:

1. **Primary:** Your current SMTP (for established service)
2. **Fallback:** Resend (for reliability)

### Configuration:

```env
# Primary SMTP
EMAIL_HOST=smtp.your-provider.com
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Fallback (Resend)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@cmdanigeria.net
```

---

## Monitoring

After setup, monitor which service is being used:

```bash
# Check logs for fallback usage
pm2 logs | grep -i "email"

# You should see:
# ✅ "Email sent via primary SMTP" (when working)
# ⚠️  "Primary email failed, trying Resend fallback" (when fallback used)
# ❌ "All email services failed" (when both fail)
```

---

## Quick Start (Copy-Paste)

### 1. Sign up for Resend (2 minutes)
Visit: https://resend.com → Sign up → Get API key

### 2. Add to your droplet

```bash
ssh root@64.23.254.48

# Install Resend
cd /var/www/cmda-backend
npm install resend

# Add to .env
nano .env
# Add: RESEND_API_KEY=re_your_key_here

# Rebuild and restart
npm run build
pm2 restart all

# Test
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@gmail.com"}'
```

### 3. Done! ✅

Your system now has automatic email fallback. If SMTP fails, Resend takes over instantly.

---

## Troubleshooting

### "Resend API key invalid"
- Check the key starts with `re_`
- Regenerate key in Resend dashboard
- Make sure no extra spaces in .env

### "Domain not verified"
- For testing, use: `from: 'onboarding@resend.dev'`
- For production, verify your domain in Resend dashboard

### "Still getting email errors"
- Check both EMAIL_PASS and RESEND_API_KEY are correct
- Check pm2 logs: `pm2 logs | grep -i error`
- Verify .env was reloaded: `pm2 restart all --update-env`

---

## Support

Need help? Check these:
- Resend docs: https://resend.com/docs
- Test email endpoint: https://resend.com/test
- Status page: https://status.resend.com
