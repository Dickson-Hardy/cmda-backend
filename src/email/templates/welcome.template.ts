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
              Welcome to CMDA Nigeria!
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
              Thank you for registering with CMDA Nigeria! We are thrilled to have you on board.
              As part of our community, you'll have access to exclusive features and updates.
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
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">Member Account Created!</h1>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                A member account has been created for you on CMDA Nigeria. You can log in using the
                credentials below:
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
                Password: [Password]
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Please log in and change your password immediately.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions or are having trouble with the platform, feel free to
                <a href="mailto:support@cmdanigeria.net" style="color: #994279">contact us</a>.
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
                3 Negroe Crescent, Maitama, Abuja, FCT, Nigeria.
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
