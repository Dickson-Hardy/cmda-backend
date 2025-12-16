export const WELCOME_FOLLOWUP_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Welcome to CMDA Nigeria - Getting Started</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #4CAF50; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">👋 Welcome Aboard!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; color: #555;">Dear [Name],</p>
    
    <p style="font-size: 16px; line-height: 1.8;">
      We hope you're settling in well! It's been [DaysSinceRegistration] days since you joined CMDA Nigeria, 
      and we wanted to reach out to help you make the most of your membership.
    </p>
    
    <h3 style="color: #4CAF50;">🚀 Getting Started Guide</h3>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin-top: 0; color: #333;">1. Complete Your Profile</h4>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        Add your profile photo, update your information, and connect with fellow members.
      </p>
      <a href="https://cmdanigeria.net/dashboard/profile" 
         style="color: #4CAF50; text-decoration: none; font-weight: bold;">Complete Profile →</a>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin-top: 0; color: #333;">2. Subscribe for Full Access</h4>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        Unlock all features including event registration, resources, and networking opportunities.
      </p>
      <a href="https://cmdanigeria.net/dashboard/payments" 
         style="color: #4CAF50; text-decoration: none; font-weight: bold;">Subscribe Now →</a>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin-top: 0; color: #333;">3. Explore Upcoming Events</h4>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        Check out our calendar of conferences, trainings, and networking events.
      </p>
      <a href="https://cmdanigeria.net/dashboard/events" 
         style="color: #4CAF50; text-decoration: none; font-weight: bold;">View Events →</a>
    </div>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <h4 style="margin-top: 0; color: #333;">4. Access Resources</h4>
      <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
        Browse our library of devotionals, articles, and professional resources.
      </p>
      <a href="https://cmdanigeria.net/dashboard/resources" 
         style="color: #4CAF50; text-decoration: none; font-weight: bold;">Browse Resources →</a>
    </div>
    
    <div style="background-color: #E8F5E9; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; border-radius: 5px;">
      <h3 style="margin-top: 0; color: #2E7D32;">💡 Need Help?</h3>
      <p style="margin-bottom: 0; font-size: 14px; color: #555;">
        Our team is here to assist you! Contact us at 
        <a href="mailto:office@cmdanigeria.org" style="color: #4CAF50;">office@cmdanigeria.org</a> 
        or visit our <a href="https://cmdanigeria.net/help" style="color: #4CAF50;">Help Center</a>.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://cmdanigeria.net/dashboard" 
         style="background-color: #4CAF50; color: white; padding: 16px 40px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Go to Dashboard
      </a>
    </div>
    
    <p style="font-size: 16px; color: #555;">
      We're excited to have you in our community!<br>
      <strong>The CMDA Nigeria Team</strong>
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>Christian Medical & Dental Association of Nigeria</p>
    <p>Wholeness House Gwagwalada, FCT, Nigeria</p>
  </div>
</body>
</html>
`;

export const ENGAGEMENT_FOLLOWUP_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>We Miss You at CMDA Nigeria</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #9C27B0; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">👋 We Miss You!</h1>
  </div>
  
  <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 18px; color: #555;">Dear [Name],</p>
    
    <p style="font-size: 16px; line-height: 1.8;">
      We noticed you haven't been active in a while, and we wanted to check in! 
      The CMDA Nigeria community is stronger with you in it.
    </p>
    
    <h3 style="color: #9C27B0;">📅 What You've Missed:</h3>
    
    <div style="background-color: white; padding: 20px; border-radius: 5px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <ul style="color: #555; font-size: 15px; line-height: 1.8;">
        <li>New devotionals and spiritual resources</li>
        <li>Upcoming conferences and training events</li>
        <li>Networking opportunities with fellow Christian healthcare professionals</li>
        <li>Latest updates from the CMDA community</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://cmdanigeria.net/dashboard" 
         style="background-color: #9C27B0; color: white; padding: 16px 40px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Return to Dashboard
      </a>
    </div>
    
    <p style="font-size: 14px; color: #777; margin-top: 30px; text-align: center;">
      We're here whenever you're ready to reconnect!
    </p>
  </div>
  
  <div style="text-align: center; padding: 20px; font-size: 12px; color: #999;">
    <p>Christian Medical & Dental Association of Nigeria</p>
  </div>
</body>
</html>
`;
