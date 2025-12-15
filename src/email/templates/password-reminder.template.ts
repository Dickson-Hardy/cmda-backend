export const PASSWORD_CHANGE_REMINDER_TEMPLATE = `
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
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">Password Change Reminder</h1>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Hello [Name],</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                This is a friendly reminder that your CMDA Nigeria account was created on <strong>[CreatedDate]</strong>, 
                but we notice you haven't changed your temporary password yet.
            </p>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                For security reasons, we strongly recommend that you log in and change your password as soon as possible.
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
                Log In and Change Password
                </a>
            </div>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Your current login credentials are:
            </p>
            <p
                style="
                color: #994279;
                font-size: 16px;
                font-weight: bold;
                margin: 20px 0;
                background-color: #f9f9f9;
                padding: 15px;
                border-left: 4px solid #994279;
                "
            >
                Email: [Email]
            </p>
            <p style="color: #ff6b6b; font-size: 14px; line-height: 1.5; margin: 20px 0">
                <strong>Important:</strong> If you did not request this account or have any concerns, 
                please contact us immediately at 
                <a href="mailto:office@cmdanigeria.org" style="color: #994279; text-decoration: none">office@cmdanigeria.org</a>
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
