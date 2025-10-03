export const CONFERENCE_UPDATE_NOTIFICATION_TEMPLATE = `
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
            <td align="center" style="background-color: #17a2b8; padding: 40px 0">
                <img
                src="https://cmdanigeria.net/CMDALogo.svg"
                alt="CMDA Nigeria"
                width="200"
                height="56"
                style="display: block"
                />
                <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">
                Conference Update
                </h1>
            </td>
            </tr>
            <!-- Body -->
            <tr>
            <td style="padding: 40px 30px">
                <h2 style="color: #333333; font-size: 22px; margin: 0">Hi [Name],</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We have an important update regarding <strong>[ConferenceName]</strong> that you're registered for.
                </p>
                
                <!-- Update Details Card -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #17a2b8">
                    <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Update Details</h3>
                    <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0">
                        [UpdateMessage]
                    </p>
                </div>

                <!-- Conference Details Card -->
                <div style="background-color: #e7f3ff; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #994279">
                    <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Conference Information</h3>
                    <table width="100%" style="font-size: 14px; color: #666666;">
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Conference:</td>
                            <td style="padding: 5px 0;">[ConferenceName]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Date:</td>
                            <td style="padding: 5px 0;">[ConferenceDate]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Venue:</td>
                            <td style="padding: 5px 0;">[ConferenceVenue]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Type:</td>
                            <td style="padding: 5px 0;">[ConferenceType]</td>
                        </tr>
                    </table>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Please make note of this update and adjust your plans accordingly. We appreciate your understanding and flexibility.
                </p>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0">
                    <a href="[ConferenceUrl]" style="background-color: #994279; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block">
                        View Updated Conference Details
                    </a>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions about this update or need to make changes to your registration, please contact us at 
                <a href="mailto:info@cmdanigeria.net" style="color: #994279;">info@cmdanigeria.net</a>.
                </p>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We look forward to seeing you at the conference!
                </p>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 30px 0 0 0">
                Blessings,<br />
                <strong>The CMDA Nigeria Team</strong>
                </p>
            </td>
            </tr>

            <!-- Footer -->
            <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center">
                <p style="color: #999999; font-size: 14px; margin: 0">
                © 2025 Christian Medical and Dental Association of Nigeria
                </p>
                <p style="color: #999999; font-size: 14px; margin: 10px 0 0 0">
                <a href="https://cmdanigeria.net" style="color: #994279; text-decoration: none">
                    Visit our website
                </a>
                |
                <a href="mailto:info@cmdanigeria.net" style="color: #994279; text-decoration: none">
                    Contact us
                </a>
                </p>
            </td>
            </tr>
        </table>
        </td>
    </tr>
    </table>
</div>
`;
