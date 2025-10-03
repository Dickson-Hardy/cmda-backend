export const VERIFICATION_CODE_EMAIL_TEMPLATE = `
<div style="margin: 0; padding: 0; font-family: 'Roboto', sans-serif">
<table
  width="100%"
  border="0"
  cellspacing="0"
  cellpadding="0"
  style="background-color: #f4f4f4; padding: 20px"
>
  <tr>
    <td align="center">
      <table
        width="600"
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="background-color: #ffffff; border-radius: 8px; overflow: hidden"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="background-color: #994279; padding: 40px 0">
            <img
              src="https://cmdanigeria.net/CMDALogo.svg"
              alt="CMDA Nigeria"
              width="200"
              height="56"
              style="display: block"
            />
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">
              Complete Your Registration
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Thank you for joining the Christian Medical and Dental Association of Nigeria (CMDA)! 
              You're just one step away from accessing our community of healthcare professionals.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              To complete your registration, please enter the code below in the app:
            </p>
            <div style="background-color: #f8f9fa; border: 2px solid #994279; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <p style="color: #333; font-size: 16px; margin: 0 0 10px 0;">Registration Code:</p>
              <p style="color: #994279; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 4px; font-family: 'Courier New', monospace;">
                [VerificationCode]
              </p>
            </div>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              This code expires in 30 minutes. Please complete your registration soon.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Once registered, you'll have access to:
            </p>
            <ul style="color: #666666; font-size: 16px; line-height: 1.5; margin: 10px 0 20px 30px;">
              <li>Member directory and networking</li>
              <li>Conference and event information</li>
              <li>Educational resources</li>
              <li>Community service opportunities</li>
            </ul>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              If you didn't register for CMDA Nigeria, please ignore this email.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Questions? Contact us at 
              <a href="mailto:office@cmdanigeria.org" style="color: #994279; text-decoration: none;">office@cmdanigeria.org</a>
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 40px 0 0 0">
              Best regards,<br />
              <strong>The CMDA Nigeria Team</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f4f4f4; padding: 30px 20px">
            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0">
              <strong>Christian Medical and Dental Association of Nigeria</strong>
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0">
              Wholeness House, Gwagwalada, FCT, Nigeria
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0">
              Email: <a href="mailto:office@cmdanigeria.org" style="color: #994279;">office@cmdanigeria.org</a> | 
              Website: <a href="https://cmdanigeria.net" style="color: #994279;">cmdanigeria.net</a>
            </p>
            <p style="color: #666666; font-size: 12px; margin: 15px 0 0 0">
              &copy; 2024 CMDA Nigeria. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</div>
`;
