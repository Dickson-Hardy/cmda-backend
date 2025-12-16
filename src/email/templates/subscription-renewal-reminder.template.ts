export const SUBSCRIPTION_RENEWAL_REMINDER_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Subscription Renewal Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #FF9800; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Subscription Renewal Reminder</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; color: #555;">Dear [Name],</p>
    
    <p style="font-size: 16px; line-height: 1.8;">
      This is a friendly reminder that your CMDA Nigeria membership subscription will expire in <strong style="color: #FF9800;">[DaysRemaining] days</strong> 
      on <strong>[ExpiryDate]</strong>.
    </p>
    
    <div style="background-color: #FFF3E0; padding: 20px; border-left: 4px solid #FF9800; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #E65100;">⚠️ Don't Lose Access!</h3>
      <p style="margin-bottom: 0; font-size: 14px; color: #555;">
        After your subscription expires, you will lose access to:
      </p>
      <ul style="color: #555; font-size: 14px;">
        <li>Event registrations and conference attendance</li>
        <li>Exclusive member resources and materials</li>
        <li>Member-only networking opportunities</li>
        <li>Access to the member portal and features</li>
      </ul>
    </div>
    
    <h3 style="color: #333;">Renew Today and Continue Enjoying:</h3>
    <ul style="font-size: 15px; line-height: 1.8;">
      <li>✅ Full access to CMDA events and conferences</li>
      <li>✅ Exclusive resources for Christian medical professionals</li>
      <li>✅ Networking with fellow believers in healthcare</li>
      <li>✅ Spiritual growth and professional development</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://cmdanigeria.net/dashboard/payments" 
         style="background-color: #FF9800; color: white; padding: 16px 40px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Renew Now
      </a>
    </div>
    
    <p style="font-size: 14px; color: #777; margin-top: 30px;">
      If you have already renewed your subscription, please disregard this message.
    </p>
    
    <p style="font-size: 14px; color: #777;">
      Need help? Contact us at <a href="mailto:office@cmdanigeria.org" style="color: #FF9800;">office@cmdanigeria.org</a>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>Christian Medical & Dental Association of Nigeria</p>
    <p>Wholeness House Gwagwalada, FCT, Nigeria</p>
  </div>
</body>
</html>
`;
