export const PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE = `
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
              alt="Logo"
              width="200"
              height="56"
              style="display: block"
            />
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">
              Password Reset Request
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              We received a request to reset your password for your CMDA Nigeria account. Please
              use the code below to reset your password.
            </p>
            <p style="color: #994279; font-size: 28px; font-weight: bold; margin: 20px 0; letter-spacing: 4px;">
              [ResetToken]
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Use this code within the next 30 minutes to reset your password. If you did not
              request a password reset, please ignore this email.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              If you have any questions or are having trouble with the platform, feel free to
              <a href="mailto:support@cmdanigeria.com" style="color: #994279">contact us</a>.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 40px 0 0 0">
              Best regards,<br />
              The Administrator,<br />
              CMDA Nigeria Team
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f4f4f4; padding: 20px 0">
            <p style="color: #666666; font-size: 14px; margin: 0">
              &copy; 2024 CMDA Nigeria. All rights reserved.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 4px 0">
              Wholeness House Gwagwalada, FCT, Nigeria.
            </p>
            <p style="color: #666666; font-size: 14px; margin: 0">
              <a href="#" style="color: #994279">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</div>
`;
