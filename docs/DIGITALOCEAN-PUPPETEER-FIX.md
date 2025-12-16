# DigitalOcean App Platform Deployment Guide

## Puppeteer Chrome Configuration Fix

This guide addresses the "Could not find Chrome" error when deploying the CMDA Backend to DigitalOcean App Platform.

## Problem

Puppeteer cannot find Chrome browser in containerized environments because:
1. Chrome/Chromium is not included by default in Node.js Docker images
2. The default Puppeteer bundled Chrome path doesn't work in production

## Solution

### 1. Dockerfile Configuration

The `Dockerfile` has been configured to:
- Use Node.js 22 slim base image
- Install Chromium and all required dependencies
- Set environment variables to point Puppeteer to system Chromium
- Skip downloading bundled Chromium to save space and time

### 2. Puppeteer Configuration

Both services have been updated to:
- Detect and use system-installed Chromium via environment variables
- Fall back to `/usr/bin/chromium` path in production
- Include all necessary Chrome flags for containerized environments

### 3. DigitalOcean App Platform Setup

#### Method 1: Using Dockerfile (Recommended)

1. **App Spec Configuration:**

Create or update your `.do/app.yaml` file:

```yaml
name: cmda-backend
region: nyc
services:
  - name: api
    dockerfile_path: Dockerfile
    github:
      repo: Dickson-Hardy/cmda-backend
      branch: main
      deploy_on_push: true
    envs:
      - key: NODE_ENV
        value: "production"
      - key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
        value: "true"
      - key: PUPPETEER_EXECUTABLE_PATH
        value: "/usr/bin/chromium"
      - key: CHROME_PATH
        value: "/usr/bin/chromium"
      # Add all other environment variables here
      - key: PORT
        value: "8080"
    health_check:
      http_path: /
      initial_delay_seconds: 60
    http_port: 8080
    instance_count: 1
    instance_size_slug: professional-xs
    routes:
      - path: /
```

2. **Environment Variables:**

In the DigitalOcean App Platform console, add these environment variables:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- `CHROME_PATH=/usr/bin/chromium`

#### Method 2: Using Buildpack (Alternative)

If not using Dockerfile, add a `.profile` file in the root directory:

```bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
export CHROME_PATH=/usr/bin/chromium
```

And install Chromium buildpack in App Platform settings.

### 4. Resources Required

The Puppeteer service requires adequate resources:
- **Minimum:** Professional-XS ($12/month)
  - 1 vCPU
  - 512 MB RAM
- **Recommended:** Professional-S ($24/month)
  - 1 vCPU
  - 1 GB RAM

Basic tier is not sufficient for running Chromium.

## Deployment Steps

1. **Commit Changes:**
```bash
git add Dockerfile
git add src/donations/donation-receipt-image.service.ts
git add src/subscriptions/receipt-image.service.ts
git commit -m "fix: configure Puppeteer for DigitalOcean deployment"
git push origin main
```

2. **Update App Settings in DigitalOcean:**
   - Go to your app in DigitalOcean console
   - Navigate to Settings → Components → api
   - Update to use Dockerfile as the source
   - Add environment variables
   - Update instance size if needed

3. **Deploy:**
   - Trigger deployment from DigitalOcean dashboard
   - Or push to the configured branch

4. **Monitor Logs:**
   - Watch deployment logs for any errors
   - Check runtime logs to ensure browser launches successfully

## Testing Locally with Docker

To test the Docker configuration locally:

```bash
# Build the image
docker build -t cmda-backend .

# Run the container
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
  -e DATABASE_URL=your_mongodb_url \
  cmda-backend
```

## Troubleshooting

### Error: "Could not find Chrome"
- Ensure Dockerfile is being used (not just buildpack)
- Verify environment variables are set
- Check that Chromium is installed in the image

### Error: "Failed to launch browser"
- Increase instance size (more RAM needed)
- Check Chrome flags in the service files
- Ensure `--no-sandbox` flag is present

### High Memory Usage
- Consider using `--single-process` flag (already added)
- Limit concurrent browser instances
- Increase instance size

### Timeout on Health Check
- Increase `initial_delay_seconds` to 90 or 120
- Browser initialization can take 30-60 seconds on first run

## Alternative Solutions

### Option 1: Use Puppeteer Core + Chrome AWS Lambda
For serverless/lightweight deployments:
```bash
pnpm add chrome-aws-lambda puppeteer-core
```

### Option 2: External Service
Use external screenshot services like:
- Cloudinary
- Screenshot API
- imgix

### Option 3: Queue-based Processing
Move Puppeteer operations to a separate worker service.

## Cost Considerations

Running Puppeteer increases hosting costs:
- **Without Puppeteer:** Basic tier ($5/month)
- **With Puppeteer:** Professional-XS or higher ($12-24/month)

Consider implementing:
- Caching of generated images
- Lazy generation (on-demand only)
- CDN storage for generated receipts

## Additional Resources

- [Puppeteer Troubleshooting Guide](https://pptr.dev/troubleshooting)
- [DigitalOcean Dockerfile Reference](https://docs.digitalocean.com/products/app-platform/reference/dockerfile/)
- [Chrome Flags Explained](https://peter.sh/experiments/chromium-command-line-switches/)
