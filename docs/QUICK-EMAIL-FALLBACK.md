# Quick Email Fallback Setup - Resend

## ⚡ 5-Minute Setup

### Step 1: Get Resend API Key (2 minutes)

1. Go to **https://resend.com**
2. Click "Start Building" or "Sign Up"
3. Sign up with GitHub/Google (fastest)
4. Go to **API Keys** tab
5. Click "Create API Key"
6. Copy the key (starts with `re_`)

### Step 2: Install on Your Droplet (3 minutes)

SSH into your droplet and run:

```bash
ssh root@64.23.254.48

cd /var/www/cmda-backend

# Install Resend package
npm install resend

# Add API key to .env
nano .env
```

Add this line to your `.env` file:
```env
RESEND_API_KEY=re_your_actual_api_key_here
```

Save (Ctrl+O, Enter, Ctrl+X)

### Step 3: Deploy New Code

On your **local machine** (Windows PowerShell):

```powershell
cd C:\Users\CMD\cmda\CMDA-Backend

# Build the project
npm run build

# If build is successful, it will deploy in Step 4
```

Then on your **droplet**:

```bash
# Still in /var/www/cmda-backend
git pull origin main
npm install
npm run build
pm2 restart all

# Verify
pm2 logs --lines 20
```

You should see:
```
Resend fallback service initialized ✓
```

### Step 4: Test It Works

```bash
# Test forgot password
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'
```

Check logs:
```bash
pm2 logs | tail -20
```

You should see one of:
- ✅ `Welcome email sent via primary SMTP` (primary working)
- ✅ `Welcome email sent via Resend fallback` (fallback working)

---

## What This Does

### Automatic Fallback Logic:

```
User requests password reset
    ↓
Try Primary SMTP (your current email)
    ↓ (if fails within 45 seconds)
Automatically try Resend
    ↓ (if succeeds)
User gets email ✓
```

### Benefits:

- ✅ **Zero downtime** - If SMTP fails, Resend takes over instantly
- ✅ **Better deliverability** - Resend uses modern email infrastructure
- ✅ **Cost effective** - 3,000 free emails/month
- ✅ **No code changes needed** - Works automatically

---

## Environment Variables Summary

Add these to your `.env` on the droplet:

```env
# Primary SMTP (existing)
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=465
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-password
EMAIL_FROM=CMDA Nigeria <noreply@cmdanigeria.net>

# Fallback (NEW - add this)
RESEND_API_KEY=re_your_resend_api_key
```

---

## Testing Both Services

### Test 1: Primary SMTP Working
```bash
# Normal test - should use primary SMTP
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

pm2 logs | grep "email sent via primary SMTP"
```

### Test 2: Fallback to Resend
```bash
# Temporarily break primary SMTP
nano .env
# Change: EMAIL_PASS=wrong_password

pm2 restart all

# Test - should use Resend
curl -X POST https://api.cmdanigeria.net/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

pm2 logs | grep "Resend fallback"
# Should see: "Primary email failed. Trying Resend fallback..."

# Fix it back
nano .env
# Restore: EMAIL_PASS=correct_password
pm2 restart all
```

---

## Monitoring in Production

```bash
# Watch all email activity
pm2 logs | grep -i email

# Filter for fallback usage
pm2 logs | grep "fallback"

# Check for errors
pm2 logs | grep -i "email.*fail"
```

---

## FAQ

### Q: Do I need to verify my domain?
**A:** For testing, no. Resend provides `onboarding@resend.dev` for testing. For production, verify your domain (takes 5 minutes).

### Q: What if both services fail?
**A:** The request still succeeds, but email isn't sent. User can try again or contact support.

### Q: Will this slow down requests?
**A:** No. If primary works, response is same. If primary fails (45s), fallback adds ~2-3 seconds.

### Q: Can I use a different fallback?
**A:** Yes! The code is flexible. You can replace Resend with Brevo, Mailgun, or SendGrid.

---

## Need Help?

If you see errors:

1. **"Cannot find module 'resend'"**
   ```bash
   npm install resend
   npm run build
   pm2 restart all
   ```

2. **"RESEND_API_KEY not configured"**
   ```bash
   nano .env
   # Add: RESEND_API_KEY=re_your_key
   pm2 restart all --update-env
   ```

3. **"Invalid API key"**
   - Check key starts with `re_`
   - No spaces in .env file
   - Regenerate key in Resend dashboard

---

## Quick Command Summary

```bash
# Complete setup (copy-paste all)
ssh root@64.23.254.48
cd /var/www/cmda-backend
npm install resend
nano .env  # Add RESEND_API_KEY=re_your_key
npm run build
pm2 restart all
pm2 logs | tail -20
```

Done! Your email system now has automatic fallback. 🎉
