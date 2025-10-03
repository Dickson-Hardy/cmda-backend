export const CONFERENCE_REGISTRATION_CONFIRMATION_TEMPLATE = `
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
                Conference Registration Confirmed!
                </h1>
            </td>
            </tr>
            <!-- Body -->
            <tr>
            <td style="padding: 40px 30px">
                <h2 style="color: #333333; font-size: 22px; margin: 0">Hi [Name],</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We're excited to confirm your registration for <strong>[ConferenceName]</strong>!
                </p>
                
                <!-- Conference Details Card -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #994279">
                    <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Conference Details</h3>
                    <table width="100%" style="font-size: 14px; color: #666666;">
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Conference:</td>
                            <td style="padding: 5px 0;">[ConferenceName]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Type:</td>
                            <td style="padding: 5px 0;">[ConferenceType]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Scope:</td>
                            <td style="padding: 5px 0;">[ConferenceScope]</td>
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
                            <td style="padding: 5px 0; font-weight: bold;">Registration:</td>
                            <td style="padding: 5px 0;">[RegistrationPeriod]</td>
                        </tr>
                    </table>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Here's what you can expect:
                </p>
                <ul style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0; padding-left: 20px">
                    <li>Inspiring sessions and worship</li>
                    <li>Networking with fellow healthcare professionals</li>
                    <li>Professional development opportunities</li>
                    <li>Fellowship and spiritual growth</li>
                </ul>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We'll send you more details about the conference agenda, speakers, and logistics as we get closer to the event date.
                </p>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0">
                    <a href="[ConferenceUrl]" style="background-color: #994279; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block">
                        View Conference Details
                    </a>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions about the conference, please don't hesitate to contact us.
                </p>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We look forward to seeing you there!
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
