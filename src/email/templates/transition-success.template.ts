export const TRANSITION_SUCCESS_EMAIL_TEMPLATE = `
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
                Transition Successful!
                </h1>
            </td>
            </tr>
            <!-- Body -->
            <tr>
            <td style="padding: 40px 30px">
                <h2 style="color: #333333; font-size: 22px; margin: 0">Hi [Name],</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We are pleased to inform you that your transition has been successfully
                completed.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                <strong>Transition Details:</strong>
                </p>
                <ul style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                <li><strong>Transition From:</strong> [TransitionFrom]</li>
                    <li><strong>Transition To:</strong> [TransitionTo]</li>
                <li><strong>Specialty:</strong> [Specialty]</li>
                <li><strong>License Number:</strong> [LicenseNumber]</li>
                <li><strong>Region:</strong> [Region]</li>
                </ul>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Your support and involvement are invaluable as we strive to integrate faith with
                healthcare to serve humanity.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We are excited to have you with us in this next phase and look forward to your
                active participation.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions or need assistance, please do not hesitate to
                <a
                    href="mailto:office@cmdanigeria.org"
                    style="color: #994279; text-decoration: none"
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
