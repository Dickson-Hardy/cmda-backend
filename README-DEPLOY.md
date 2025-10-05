# Deployment Guide for CMDA-Backend on DigitalOcean App Service

This guide explains how to properly deploy the CMDA-Backend application to DigitalOcean App Service.

## Configuration Changes Made

The following changes were made to fix the health check failures:

1. Updated `main.ts` to:
   - Bind to host `0.0.0.0` (required for container environments)
   - Listen on port `8080` (required by DO App Service health checks)

2. Updated `package.json` start script:
   - Changed to directly use `node dist/main.js` for production

3. Updated `Procfile` to use the correct start command:
   - `web: npm start`

4. Added Docker configuration:
   - Created `Dockerfile` for container-based deployment
   - Added `.dockerignore` to optimize container builds

5. Added DigitalOcean App Platform configuration:
   - Created `.do/deploy.template.yaml` for easy deployment setup

## Deployment Options

### Option 1: Deploy through DigitalOcean Dashboard

1. Log in to your DigitalOcean account
2. Go to "Apps" in the sidebar
3. Click "Create App"
4. Connect your GitHub repository
5. Select the repository and branch
6. Ensure the HTTP port is set to `8080`
7. Configure your environment variables as needed
8. Deploy the app

### Option 2: Deploy with Docker

1. Build the Docker image:
   ```
   docker build -t cmda-backend .
   ```

2. Test locally:
   ```
   docker run -p 8080:8080 cmda-backend
   ```

3. Push to DigitalOcean Container Registry and deploy

### Option 3: Deploy with doctl CLI

1. Install `doctl` CLI
2. Authenticate:
   ```
   doctl auth init
   ```

3. Deploy using template:
   ```
   doctl apps create --spec .do/deploy.template.yaml
   ```

## Health Check Troubleshooting

If health checks continue to fail:

1. Check logs using DigitalOcean dashboard
2. Verify the application is listening on port 8080
3. Ensure no firewalls are blocking the health check
4. Try adding a simple health check endpoint at `/`:
   ```typescript
   @Get()
   healthCheck() {
     return { status: 'ok' };
   }
   ```

5. Increase the initial delay seconds in the health check configuration

## Environment Variables

Ensure these environment variables are set in your DigitalOcean App:

- `PORT=8080` (required)
- `NODE_ENV=production`
- Any other environment variables your application needs

## Monitoring and Scaling

Monitor your application's performance in the DigitalOcean dashboard and scale as needed.