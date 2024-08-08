export const DONATION_CONFIRMATION_EMAIL_TEMPLATE = `
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
                Thank you for your donation!
                </h1>
            </td>
            </tr>
            <!-- Body -->
            <tr>
            <td style="padding: 40px 30px">
                <h2 style="color: #333333; font-size: 22px; margin: 0">Hi [Name],</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Thank you for your generous donation.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Your support and contributions are invaluable and directly contribute to our mission of integrating faith with healthcare to serve humanity.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We are truly grateful for your trust and partnership in this journey.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                May you be richly blessed for your generosity.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                You are receiving this message because you made a donation to CMDA Nigeria. If you did
                not make this donation, please ignore this message.
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions or need a receipt for your donation, feel free to
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
