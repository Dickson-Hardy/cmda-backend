export const EVENT_REMINDER_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
  <meta charset="UTF-8">
  <title>Event Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #994279; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#F7EAF2;color:#994279;font-size:16px;line-height:1;">📅</span> Event Reminder</h1>
  </div>
  
  <div style="background-color: #F4F4F4; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; color: #555;">Dear [Name],</p>
    
    <p style="font-size: 16px; line-height: 1.8;">
      This is a reminder that you are registered for the upcoming [EventType]:
    </p>
    
    <div style="background-color: white; padding: 25px; border-left: 4px solid #994279; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h2 style="margin-top: 0; color: #994279; font-size: 24px;">[EventName]</h2>
      
      <div style="margin: 15px 0;">
        <p style="margin: 8px 0; font-size: 15px;">
          <strong><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#F7EAF2;color:#994279;font-size:16px;line-height:1;">📅</span> Date:</strong> [EventDate]
        </p>
        <p style="margin: 8px 0; font-size: 15px;">
          <strong>🕐 Time:</strong> [EventTime]
        </p>
        <p style="margin: 8px 0; font-size: 15px;">
          <strong>📍 Location:</strong> [EventLocation]
        </p>
        <p style="margin: 8px 0; font-size: 15px;">
          <strong><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#F7EAF2;color:#994279;font-size:16px;line-height:1;">⏱️</span> Time Until Event:</strong> <span style="color: #994279; font-weight: bold;">[TimeUntilEvent]</span>
        </p>
      </div>
    </div>
    
    [VirtualMeetingInfo]
    
    <div style="background-color: #F7EAF2; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #6E2F50;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#F7EAF2;color:#994279;font-size:16px;line-height:1;">📝</span> Important Reminders:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #555;">
        <li style="margin: 8px 0;">Please arrive [ArrivalTime] minutes early</li>
        <li style="margin: 8px 0;">Bring your registration confirmation</li>
        <li style="margin: 8px 0;">Check the event page for any last-minute updates</li>
        [AdditionalReminders]
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="[EventUrl]" 
         style="background-color: #994279; color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; margin: 5px;">
        View Event Details
      </a>
      <a href="[FrontendUrl]/dashboard/events/registered" 
         style="background-color: #994279; color: white; padding: 14px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; margin: 5px;">
        My Registered Events
      </a>
    </div>
    
    <p style="font-size: 14px; color: #777; margin-top: 30px;">
      Can't make it? Please let us know by canceling your registration on the event page.
    </p>
    
    <p style="font-size: 16px; color: #555;">
      We look forward to seeing you there!<br>
      <strong>The CMDA Nigeria Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>Christian Medical & Dental Association of Nigeria</p>
    <p>Email: office@cmdanigeria.org | Website: www.cmdanigeria.net</p>
  </div>
</body>
</html>
`;

export const VIRTUAL_MEETING_INFO_SNIPPET = `
<div style="background-color: #F7EAF2; padding: 20px; border-left: 4px solid #994279; margin: 20px 0; border-radius: 5px;">
  <h3 style="margin-top: 0; color: #6E2F50;"><span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background-color:#F7EAF2;color:#994279;font-size:16px;line-height:1;">💻</span> Virtual Meeting Details</h3>
  <p style="margin: 8px 0; font-size: 15px;">
    <strong>Platform:</strong> [Platform]
  </p>
  <p style="margin: 8px 0; font-size: 15px;">
    <strong>Meeting Link:</strong> <a href="[MeetingLink]" style="color: #994279; word-break: break-all;">[MeetingLink]</a>
  </p>
  [MeetingIdInfo]
  [PasscodeInfo]
</div>
`;
