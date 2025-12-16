# Scheduled Email System - Quick Start Guide

## Overview
The platform now sends automatic emails to members for birthdays, subscription renewals, event reminders, and follow-ups.

## What's Automated

### 1. Birthday Emails (6:00 AM Daily)
- Automatically sent to members on their birthday
- Requires valid `dateOfBirth` in member profile

### 2. Subscription Renewal Reminders (8:00 AM Daily)
- Sent at: 30, 14, 7, 3, and 1 days before subscription expires
- Only to members with active/pending subscriptions

### 3. Event Reminders (9:00 AM Daily)
- Sent 7 days and 1 day before events/conferences
- Only to registered attendees
- Includes virtual meeting details (if applicable)

### 4. Member Follow-ups (10:00 AM Daily)
- Day 3: Getting started guide
- Day 7: Making the most of membership
- Day 30: Re-engagement message

## Admin Controls

### Manual Testing
You can trigger any scheduled email immediately for testing:

1. Go to Postman or use the API
2. Send POST requests to:
   ```
   POST /scheduled-emails/trigger/birthday
   POST /scheduled-emails/trigger/subscription-reminders
   POST /scheduled-emails/trigger/event-reminders
   POST /scheduled-emails/trigger/followup
   ```
3. Must be logged in as Admin or SuperAdmin

### Monitoring
- Check server logs for execution details
- Each job logs:
  - How many recipients found
  - Emails sent successfully
  - Any failures with error details

## Data Requirements

### For Birthday Emails
- Member must have `dateOfBirth` field set
- Month and day must match today's date

### For Subscription Reminders
- Member must have `subscriptionExpiryDate` set
- `subscriptionStatus` must be "active" or "pending"

### For Event Reminders
- Event must have `eventDateTime` set
- Event must have registered users

### For Follow-up Emails
- Automatically sent based on `createdAt` date

## Email Templates

All templates are professional, branded, and mobile-responsive:

- **Birthday**: Purple gradient, celebration theme
- **Subscription**: Orange warning theme with benefits list
- **Event**: Blue theme with event details and meeting info
- **Follow-up**: Green/purple theme with action items

## Troubleshooting

### Emails Not Sending
1. Check if cron jobs are enabled (see server logs)
2. Verify email service is configured (Resend API or SMTP)
3. Check member data has required fields

### Wrong Recipients
1. Verify date/time fields in database
2. Check timezone configuration (Africa/Lagos)

### Duplicate Emails
1. Ensure only one server instance is running cron jobs
2. Check logs for duplicate executions

## Best Practices

1. **Test Before Launch**: Use manual trigger endpoints
2. **Monitor Logs**: Check daily for errors
3. **Member Data**: Ensure profiles have complete information
4. **Email Preferences**: Respect user unsubscribe requests (future feature)

## Performance

Expected daily volume:
- Birthday: 100-500 emails
- Subscription: 50-200 emails
- Event reminders: 100-1000 emails
- Follow-ups: 20-100 emails

**Total**: ~270-1800 automated emails per day

## Support

For issues or questions:
- Check full documentation: `docs/SCHEDULED-EMAIL-SYSTEM.md`
- Review server logs for detailed error messages
- Contact development team

---

**Status**: ✅ Active and running automatically
**Last Updated**: 2025-01-09
