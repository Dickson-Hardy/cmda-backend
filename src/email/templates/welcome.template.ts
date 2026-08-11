export const WELCOME_EMAIL_TEMPLATE = `
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
        width="100%"
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden"
      >
        <!-- Header -->
        <tr>
          <td align="center" style="background-color: #994279; padding: 28px 24px">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="background-color: #ffffff; border-radius: 12px; padding: 10px">
                  <img
                    src="https://cmdanigeria.net/CMDALOGO_white.png"
                    alt="CMDA Nigeria"
                    width="82"
                    height="82"
                    style="display: block; width: 82px; height: 82px; border: 0"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color: #ffffff; font-size: 24px; line-height: 1.3; margin: 18px 0 0 0; padding: 0">
              [WelcomeHeading]
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              [WelcomeIntro]
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Use the verification code below to complete your registration.
            </p>
            <p style="color: #994279; font-size: 28px; font-weight: bold; margin: 20px 0; letter-spacing: 4px;">
            [VerificationCode]
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              You are receiving this message because you signed up on CMDA Nigeria. If you did not sign up, please ignore this message.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              If you have any questions or are having trouble with the platform, feel free to
              <a href="mailto:office@cmdanigeria.org" style="color: #994279; text-decoration: none"
                >contact us</a
              >.
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
              <a href="#" style="color: #994279; text-decoration: none">Unsubscribe</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</div>
`;

export const MEMBER_CREDENTIALS_TEMPLATE = `
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
        width="100%"
        border="0"
        cellspacing="0"
        cellpadding="0"
        style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden"
        >
        <!-- Header -->
        <tr>
            <td align="center" style="background-color: #994279; padding: 28px 24px">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="background-color: #ffffff; border-radius: 12px; padding: 10px">
                  <img
                    src="https://cmdanigeria.net/CMDALOGO_white.png"
                    alt="CMDA Nigeria"
                    width="82"
                    height="82"
                    style="display: block; width: 82px; height: 82px; border: 0"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color: #ffffff; font-size: 24px; line-height: 1.3; margin: 18px 0 0 0; padding: 0">[AccountHeading]</h1>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                [AccountIntro]
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                You may log in using the credentials below:
            </p>
            <p
                style="
                color: #994279;
                font-size: 16px;
                font-weight: bold;
                margin: 20px 0
                "
            >
                Email: [Email]<br /> <br />
                Temporary Password: [Password]
            </p>
            <div style="text-align: center; margin: 30px 0">
                <a
                href="https://cmdanigeria.net/login"
                style="
                    display: inline-block;
                    background-color: #994279;
                    color: #ffffff;
                    padding: 14px 32px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: bold;
                "
                >
                Log In to Your Account
                </a>
            </div>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Please note that you will be prompted to change your password upon your first login for security purposes.
            </p>
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 15px; margin: 20px 0">
                <p style="color: #856404; font-size: 16px; line-height: 1.5; margin: 0">
                    <strong>Important:</strong> [ProfileReminder]
                </p>
            </div>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you experience any issues accessing your account or have questions about the platform, do not hesitate to contact us for assistance.
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
                <a href="#" style="color: #994279; text-decoration: none">Unsubscribe</a>
            </p>
            </td>
        </tr>
        </table>
    </td>
    </tr>
</table>
</div>
`;
