export const CONFERENCE_PAYMENT_CONFIRMATION_TEMPLATE = `
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
            <td align="center" style="background-color: #28a745; padding: 40px 0">
                <img
                src="https://cmdanigeria.net/CMDALogo.svg"
                alt="CMDA Nigeria"
                width="200"
                height="56"
                style="display: block"
                />
                <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">
                Payment Confirmed!
                </h1>
            </td>
            </tr>
            <!-- Body -->
            <tr>
            <td style="padding: 40px 30px">
                <h2 style="color: #333333; font-size: 22px; margin: 0">Hi [Name],</h2>
                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Thank you! Your payment for <strong>[ConferenceName]</strong> has been successfully processed.
                </p>
                
                <!-- Payment Details Card -->
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #28a745">
                    <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Payment Summary</h3>
                    <table width="100%" style="font-size: 14px; color: #666666;">
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Conference:</td>
                            <td style="padding: 5px 0;">[ConferenceName]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Amount Paid:</td>
                            <td style="padding: 5px 0; font-weight: bold; color: #28a745;">[AmountPaid]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Registration Type:</td>
                            <td style="padding: 5px 0;">[RegistrationPeriod]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Payment Method:</td>
                            <td style="padding: 5px 0;">[PaymentMethod]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Transaction ID:</td>
                            <td style="padding: 5px 0;">[TransactionId]</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Payment Date:</td>
                            <td style="padding: 5px 0;">[PaymentDate]</td>
                        </tr>
                    </table>
                </div>

                <!-- Conference Details Card -->
                <div style="background-color: #e7f3ff; border-radius: 8px; padding: 30px; margin: 30px 0; border-left: 4px solid #994279">
                    <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Conference Information</h3>
                    <table width="100%" style="font-size: 14px; color: #666666;">
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
                        <tr>
                            <td style="padding: 5px 0; font-weight: bold;">Scope:</td>
                            <td style="padding: 5px 0;">[ConferenceScope]</td>
                        </tr>
                    </table>
                </div>

                <div style="background-color: #fff3cd; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #ffc107">
                    <h4 style="color: #856404; font-size: 16px; margin: 0 0 10px 0">📧 Keep This Email</h4>
                    <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.4">
                        Please save this email as your payment receipt. You may need to present it at the conference registration desk.
                    </p>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                <strong>What's Next?</strong>
                </p>
                <ul style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0; padding-left: 20px">
                    <li>You'll receive conference updates and agenda details via email</li>
                    <li>Check your email regularly for important announcements</li>
                    <li>Arrive early on the conference day for smooth check-in</li>
                    <li>Bring this email confirmation (digital or printed)</li>
                </ul>

                <!-- Action Button -->
                <div style="text-align: center; margin: 30px 0">
                    <a href="[ConferenceUrl]" style="background-color: #994279; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block">
                        View Conference Details
                    </a>
                </div>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                If you have any questions about your registration or the conference, please contact us at 
                <a href="mailto:info@cmdanigeria.net" style="color: #994279;">info@cmdanigeria.net</a>.
                </p>

                <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                We're excited to see you at the conference!
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
