# Scheduled Email System

## Overview
The CMDA Nigeria platform now includes a comprehensive automated email system that sends scheduled emails to members based on various triggers and time intervals. This system improves member engagement, retention, and event attendance.

## Email Types

### 1. Birthday Emails 🎉
- **Trigger**: Automatically sent on member's birthday
- **Schedule**: Daily at 6:00 AM (Africa/Lagos timezone)
- **Recipients**: All members with a valid dateOfBirth
- **Purpose**: Show appreciation and strengthen community bonds
- **Template**: [birthday.template.ts](../src/email/templates/birthday.template.ts)

**Features**:
- Personalized greeting with member's name
- Biblical blessing (Numbers 6:24-26)
- Call-to-action button to dashboard
- Beautiful gradient header design

### 2. Subscription Renewal Reminders ⏰
- **Trigger**: Sent at specific intervals before subscription expiry
- **Schedule**: Daily at 8:00 AM (Africa/Lagos timezone)
- **Reminder Intervals**: 30, 14, 7, 3, and 1 days before expiry
- **Recipients**: Members with active/pending subscriptions approaching expiry
- **Purpose**: Reduce churn by reminding members to renew
- **Template**: [subscription-renewal-reminder.template.ts](../src/email/templates/subscription-renewal-reminder.template.ts)

**Features**:
- Shows exact days remaining
- Lists benefits that will be lost
- Clear "Renew Now" call-to-action
- Warning-styled design (orange theme)

### 3. Event Reminder Emails 📅
- **Trigger**: Sent before registered events/conferences
- **Schedule**: Daily at 9:00 AM (Africa/Lagos timezone)
- **Reminder Intervals**: 7 days and 1 day before event
- **Recipients**: Members registered for upcoming events
- **Purpose**: Increase attendance and reduce no-shows
- **Template**: [event-reminder.template.ts](../src/email/templates/event-reminder.template.ts)

**Features**:
- Event details (date, time, location)
- Time until event countdown
- Virtual meeting information (if applicable)
  - Platform, meeting link, ID, passcode
- Important reminders checklist
- Quick links to event details and registered events

### 4. Follow-Up Emails After Registration 👋
- **Trigger**: Sent at intervals after member registration
- **Schedule**: Daily at 10:00 AM (Africa/Lagos timezone)
- **Follow-up Intervals**:
  - **Day 3**: Welcome & Getting Started guide
  - **Day 7**: Making the most of membership
  - **Day 30**: Re-engagement ("We miss you!")
- **Recipients**: Newly registered members
- **Purpose**: Onboard new members and guide them to key features
- **Templates**: [followup.template.ts](../src/email/templates/followup.template.ts)

**Features**:
- Progressive onboarding content
- Action-oriented checklists
- Links to key platform sections (profile, payments, events, resources)
- Help center information

## Technical Implementation

### File Structure
```
src/
├── scheduled-emails/
│   ├── scheduled-emails.module.ts
│   ├── scheduled-emails.service.ts
│   └── scheduled-emails.controller.ts
└── email/
    └── templates/
        ├── birthday.template.ts
        ├── subscription-renewal-reminder.template.ts
        ├── event-reminder.template.ts
        └── followup.template.ts
```

### Cron Job Schedule

| Email Type | Cron Expression | Time (WAT) | Frequency |
|------------|----------------|------------|-----------|
| Birthday | `0 6 * * *` | 6:00 AM | Daily |
| Subscription Reminders | `0 8 * * *` | 8:00 AM | Daily |
| Event Reminders | `0 9 * * *` | 9:00 AM | Daily |
| Follow-ups | `0 10 * * *` | 10:00 AM | Daily |

### Dependencies
- `@nestjs/schedule` (v4.0.0) - Cron job scheduling
- `mongoose` - Database queries
- `EmailService` - Email sending with Resend/SMTP fallback

### Database Queries

**Birthday Emails**:
```typescript
userModel.find({ dateOfBirth: { $exists: true, $ne: null } })
// Filter in memory for current month/day
```

**Subscription Reminders**:
```typescript
userModel.find({
  subscriptionExpiryDate: { $gte: startOfDay, $lte: targetDate },
  subscriptionStatus: { $in: ['active', 'pending'] }
})
```

**Event Reminders**:
```typescript
eventModel.find({
  eventDateTime: { $gte: startOfDay, $lte: targetDate }
}).populate('registeredUsers', 'email firstName')
```

**Follow-ups**:
```typescript
userModel.find({
  createdAt: { $gte: startOfDay, $lte: targetDate }
})
```

## Admin Testing Endpoints

Admin users can manually trigger scheduled emails for testing purposes:

### Endpoints

**Base URL**: `/scheduled-emails`

**Authentication**: Requires JWT token with Admin or SuperAdmin role

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trigger/birthday` | POST | Send birthday emails immediately |
| `/trigger/subscription-reminders` | POST | Send subscription reminders |
| `/trigger/event-reminders` | POST | Send event reminders |
| `/trigger/followup` | POST | Send follow-up emails |

### Example Request (Postman/cURL)
```bash
curl -X POST https://cmda-backend.vercel.app/scheduled-emails/trigger/birthday \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### Response Format
```json
{
  "success": true,
  "message": "Birthday emails triggered successfully"
}
```

## Email Template Variables

### Birthday Email
- `[Name]` - Member's first name

### Subscription Reminder
- `[Name]` - Member's first name
- `[DaysRemaining]` - Days until expiry
- `[ExpiryDate]` - Formatted expiry date

### Event Reminder
- `[Name]` - Member's first name
- `[EventType]` - "Event" or "Conference"
- `[EventName]` - Event title
- `[EventDate]` - Formatted event date
- `[EventTime]` - Formatted event time
- `[EventLocation]` - Event location
- `[TimeUntilEvent]` - "1 Week" or "1 Day"
- `[ArrivalTime]` - Suggested arrival time
- `[EventUrl]` - Link to event details
- `[VirtualMeetingInfo]` - Virtual meeting details (conditional)

### Follow-up Email
- `[Name]` - Member's first name
- `[DaysSinceRegistration]` - Days since joining

## Logging

All scheduled email jobs log their operations:

```typescript
this.logger.log('Running birthday email cron job...');
this.logger.log(`Found ${birthdayUsers.length} users with birthdays today`);
this.logger.log(`Birthday email sent to ${user.email}`);
this.logger.error(`Failed to send birthday email to ${user.email}:`, error);
```

View logs in console or application logging service.

## Error Handling

- Individual email failures don't stop the batch
- Errors are logged with recipient email and error details
- Service continues processing remaining emails
- Database query errors are caught and logged

## Future Enhancements (Drip Campaigns)

### Planned Features
1. **Campaign Schema** - Define multi-step email sequences
2. **Campaign Triggers** - New member, event registration, subscription
3. **Delay Configuration** - Set custom delays between emails
4. **A/B Testing** - Test different email variations
5. **Analytics Dashboard** - Track open rates, clicks, conversions
6. **Template Builder** - Admin UI to create custom templates
7. **Personalization** - Dynamic content based on member data
8. **Segmentation** - Target specific member groups

### Example Campaign Flow
```
New Member Campaign:
├── Day 0: Welcome email (existing)
├── Day 3: Getting started guide (existing)
├── Day 7: Feature highlights (existing)
├── Day 14: Success stories & testimonials (new)
├── Day 30: Re-engagement offer (existing)
└── Day 60: Survey & feedback request (new)
```

## Monitoring & Maintenance

### Health Checks
- Monitor cron job execution logs
- Track email delivery success rates
- Review bounce and complaint rates
- Check database query performance

### Optimization Tips
1. Use database indexes on frequently queried fields:
   - `dateOfBirth`
   - `subscriptionExpiryDate`
   - `eventDateTime`
   - `createdAt`
2. Batch email sends to avoid rate limiting
3. Implement queue system for high volume
4. Add email preference management (unsubscribe options)

### Timezone Considerations
- All cron jobs use `Africa/Lagos` timezone (WAT)
- Date comparisons use UTC internally
- Display dates in user's preferred timezone (future enhancement)

## Email Delivery Infrastructure

The scheduled emails use the existing email infrastructure:

1. **Primary**: Resend API (fast, reliable)
2. **Fallback**: SMTP (Mailtrap/Gmail)
3. **Logging**: EmailLog schema with statuses (QUEUED, SENDING, SENT, FAILED)
4. **Queue**: BulkEmailService with queue processor

## Configuration

### Environment Variables
```env
# Email Configuration (already set up)
MAILER_FROM_EMAIL=noreply@cmdanigeria.org
MAILER_FROM_NAME=CMDA Nigeria
RESEND_API_KEY=your_resend_api_key

# SMTP Fallback
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Timezone Configuration
To change the timezone, update the `timeZone` parameter in cron decorators:
```typescript
@Cron('0 6 * * *', {
  name: 'send-birthday-emails',
  timeZone: 'Africa/Lagos', // Change this
})
```

## Testing Checklist

- [ ] Birthday email sent to test user with today's birthday
- [ ] Subscription reminder sent 30 days before expiry
- [ ] Subscription reminder sent 1 day before expiry
- [ ] Event reminder sent 7 days before event
- [ ] Event reminder sent 1 day before event
- [ ] Welcome follow-up sent 3 days after registration
- [ ] Engagement follow-up sent 30 days after registration
- [ ] Virtual meeting info displayed correctly in event reminders
- [ ] Admin trigger endpoints work with proper authentication
- [ ] Error handling works when email sending fails
- [ ] Logs show detailed information about job execution

## Deployment Notes

1. **Vercel Serverless**: Cron jobs may not work on Vercel serverless
   - Solution: Use Vercel Cron Jobs feature or external scheduler
2. **Traditional Server**: Works out of the box with Node.js
3. **Docker**: Ensure timezone is set correctly in container
4. **Load Balancing**: Only one instance should run cron jobs to avoid duplicates

## Support & Troubleshooting

### Common Issues

**Q: Cron jobs not executing**
- Check if ScheduleModule is imported in app.module.ts
- Verify timezone configuration
- Check server logs for errors

**Q: Duplicate emails sent**
- Ensure only one server instance runs cron jobs
- Consider adding a distributed lock mechanism

**Q: Wrong date/time for events**
- Verify timezone conversion logic
- Check eventDateTime field in database

**Q: Users not receiving emails**
- Check email address validity
- Review EmailLog for failed deliveries
- Verify Resend API key and SMTP credentials

## Performance Metrics

Expected performance (approximate):
- **Birthday emails**: ~100-500 emails per day
- **Subscription reminders**: ~50-200 emails per day
- **Event reminders**: ~100-1000 emails per day (varies by event count)
- **Follow-ups**: ~20-100 emails per day (based on new registrations)

**Total**: ~270-1800 automated emails per day

## Conclusion

The scheduled email system provides automated, timely communication with CMDA Nigeria members, improving engagement, retention, and event attendance. The system is built with scalability, reliability, and maintainability in mind, using NestJS's robust scheduling capabilities and the existing email infrastructure.

For questions or support, contact the development team.
