# Email Performance Diagnosis - DO Server vs Local

## Why Email is Fast Locally but Slow on DigitalOcean

### Common Causes:

1. **SMTP Port Blocking/Throttling**
   - DigitalOcean and most cloud providers block port 25
   - Port 465/587 may be rate-limited to prevent spam
   - Your local ISP may have faster SMTP routing

2. **DNS Resolution Delays**
   - Droplet DNS resolver may be slower
   - No DNS caching on first request
   - SMTP host lookup taking 2-5 seconds

3. **Network Latency**
   - Geographic distance between DO datacenter and SMTP server
   - Additional network hops in cloud environment
   - TLS handshake slower over WAN vs LAN

4. **Connection Pooling Not Working**
   - First connection always slower (TLS negotiation)
   - Pool may not be reused properly
   - Authentication happening every time

5. **SMTP Server Greylisting**
   - SMTP servers may greylist/rate-limit cloud IPs
   - Deliberate delays for unknown senders
   - Anti-spam measures targeting cloud providers

## Diagnostic Commands (Run on DO Droplet)

### 1. Test SMTP Connection Speed
```bash
# Time the SMTP connection
time openssl s_client -connect smtp.gmail.com:465 -quiet
# Press Ctrl+C after connected
# Look for "connect:" time - should be < 1 second
```

### 2. Check DNS Resolution Speed
```bash
# Time DNS lookup for your SMTP host
time nslookup smtp.gmail.com
# Should be < 200ms

# Test with different DNS servers
time nslookup smtp.gmail.com 8.8.8.8
time nslookup smtp.gmail.com 1.1.1.1
```

### 3. Check Port Accessibility
```bash
# Test if port 465 is accessible
nc -zv smtp.gmail.com 465

# Test port 587 (alternative)
nc -zv smtp.gmail.com 587

# Check if port 25 is blocked (common on DO)
nc -zv smtp.gmail.com 25
```

### 4. Check Network Latency
```bash
# Ping SMTP server
ping -c 5 smtp.gmail.com

# Traceroute to see network path
traceroute smtp.gmail.com
```

### 5. Monitor SMTP Traffic
```bash
# Install tcpdump if needed
sudo apt-get install tcpdump -y

# Monitor SMTP traffic (run in one terminal)
sudo tcpdump -i any port 465 -n

# Then test email in another terminal
```

## Solutions Based on Diagnosis

### Solution 1: Use Resend API (Recommended)
**Why it's faster:**
- API calls to Resend are typically 100-300ms
- No SMTP handshake/TLS negotiation
- Optimized for cloud infrastructure
- No port blocking issues

**Implementation:**
Already implemented! Just add to `.env` on droplet:
```bash
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=CMDA Nigeria <noreply@cmdanigeria.net>
```

### Solution 2: Enable SMTP Connection Pooling Optimization
Update `email.module.ts`:
```typescript
pool: true,
maxConnections: 10, // Increase from 5
maxMessages: 1000,  // Increase from 100
pooled: true,       // Force pooling
```

### Solution 3: Use Faster DNS Resolver
Edit `/etc/resolv.conf` on droplet:
```bash
sudo nano /etc/resolv.conf
```
Add:
```
nameserver 1.1.1.1
nameserver 8.8.8.8
```

### Solution 4: Use Gmail SMTP Relay (if using Gmail)
Configure for better cloud delivery:
```
EMAIL_HOST=smtp-relay.gmail.com
EMAIL_PORT=587
# Requires Google Workspace, better for cloud servers
```

### Solution 5: Enable SMTP Keep-Alive
Add to `email.module.ts` transport:
```typescript
keepalive: true,
keepaliveInterval: 30000, // 30 seconds
```

### Solution 6: Use Local SMTP Relay
Install Postfix on droplet as local relay:
```bash
sudo apt-get install postfix -y
# Configure as relay to your SMTP server
# Your app connects to localhost:25 (instant)
# Postfix handles external SMTP (async)
```

## Recommended Approach

**Hybrid Strategy (Best of Both Worlds):**

1. **Primary: Resend API** (Fast, reliable, cloud-optimized)
   - 100-300ms response time
   - No port blocking
   - API-based, no SMTP overhead

2. **Fallback: SMTP with Pooling** (Your current setup)
   - Enable connection pooling properly
   - Use keep-alive
   - Optimize DNS

**Quick Win:**
Just switch to Resend as primary and SMTP as fallback (reverse current setup):
```typescript
// In email.service.ts, try Resend first
try {
  await this.resendFallbackService.sendEmail(...);
  this.logger.log('Email sent via Resend API');
} catch (error) {
  this.logger.warn('Resend failed, trying SMTP fallback');
  await this.mailerService.sendMail(...);
}
```

## Monitoring Performance

Add timing logs to `email.service.ts`:
```typescript
const startTime = Date.now();
await this.mailerService.sendMail(...);
const duration = Date.now() - startTime;
this.logger.log(`Email sent in ${duration}ms`);
```

Then compare:
- Local: Typically 100-500ms
- DO Server (SMTP): 2-10 seconds (due to issues above)
- DO Server (Resend): 100-300ms (API call)

## Expected Results After Fixes

| Method | Local | DO Before | DO After Fix |
|--------|-------|-----------|--------------|
| SMTP (no pool) | 200ms | 5-10s | 1-3s |
| SMTP (pooled) | 100ms | 3-5s | 500ms-1s |
| Resend API | 150ms | 150ms | 150ms |

## Testing Performance

### Test SMTP Speed on Droplet:
```bash
cd /var/www/cmda-backend

# Create test script
cat > test-smtp-speed.js << 'EOF'
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const start = Date.now();
transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: 'test@example.com',
  subject: 'Speed Test',
  text: 'Testing SMTP speed'
}, (err, info) => {
  const duration = Date.now() - start;
  console.log(`SMTP Send Duration: ${duration}ms`);
  if (err) console.error('Error:', err);
  process.exit(0);
});
EOF

# Run test
node test-smtp-speed.js
```

### Test Resend Speed on Droplet:
```bash
curl -X POST https://api.cmdanigeria.net/email-test/test-welcome \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@gmail.com","name":"Test"}' \
  -w "\nTotal Time: %{time_total}s\n"
```

## Immediate Action

**Run this NOW on your droplet to diagnose:**
```bash
# SSH into droplet
ssh root@64.23.254.48

# Quick diagnostic
echo "=== DNS Speed ===" && time nslookup $EMAIL_HOST
echo "=== Port Test ===" && nc -zv $EMAIL_HOST 465
echo "=== Network Latency ===" && ping -c 3 $EMAIL_HOST
```

**Then share the output and I'll tell you exactly which solution to implement!**
