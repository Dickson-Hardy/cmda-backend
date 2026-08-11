import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ResendFallbackService } from './resend-fallback.service';
import { MEMBER_CREDENTIALS_TEMPLATE, WELCOME_EMAIL_TEMPLATE } from './templates/welcome.template';
import { PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE } from './templates/password-reset.template';
import { PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE } from './templates/password-success.template';
import { VERIFICATION_CODE_EMAIL_TEMPLATE } from './templates/verification-code.template';
import { ADMIN_CREDENTIALS_TEMPLATE } from './templates/admin-created.template';
import { DONATION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/donation-confirmation.template';
import { SUBSCRIPTION_CONFIRMATION_EMAIL_TEMPLATE } from './templates/subscription-confirm.template';
import { TRANSITION_SUCCESS_EMAIL_TEMPLATE } from './templates/transition-success.template';
import { CONFERENCE_REGISTRATION_CONFIRMATION_TEMPLATE } from './templates/conference-registration.template';
import { CONFERENCE_PAYMENT_CONFIRMATION_TEMPLATE } from './templates/conference-payment.template';
import { CONFERENCE_UPDATE_NOTIFICATION_TEMPLATE } from './templates/conference-update.template';
import { PASSWORD_CHANGE_REMINDER_TEMPLATE } from './templates/password-reminder.template';
import { ConfigService } from '@nestjs/config';

enum EmailPriority {
  CRITICAL = 'critical', // Onboarding, password resets - use Resend
  NORMAL = 'normal', // General notifications - use Resend if available
  LOW = 'low', // Birthday, reminders - use SMTP
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private mailerService: MailerService,
    private resendFallback: ResendFallbackService,
    private configService: ConfigService,
  ) {}

  /**
   * Route email to appropriate provider based on priority
   * CRITICAL (onboarding, password resets) → Resend
   * LOW (birthday, reminders) → SMTP
   */
  private async routeEmail({
    to,
    subject,
    html,
    text,
    priority = EmailPriority.NORMAL,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    priority?: EmailPriority;
  }): Promise<{ success: boolean }> {
    // LOW priority → SMTP directly (birthday, reminders)
    if (priority === EmailPriority.LOW) {
      return this.sendViaSmtp(to, subject, html);
    }

    // CRITICAL and NORMAL → Try Resend first
    if (this.resendFallback.isAvailable()) {
      try {
        const result = await this.resendFallback.sendEmail({ to, subject, html, text });
        if (result.success) {
          this.logger.log(`[${priority}] Email sent to ${to} via Resend`);
          return { success: true };
        }
      } catch (error) {
        this.logger.warn(`Resend failed for ${to}: ${error.message}`);
      }
    }

    // Fallback to SMTP if Resend fails or unavailable
    return this.sendViaSmtp(to, subject, html);
  }

  private async sendViaSmtp(
    to: string,
    subject: string,
    html: string,
  ): Promise<{ success: boolean }> {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SMTP timeout')), 30000),
      );

      await Promise.race([this.mailerService.sendMail({ to, subject, html }), timeoutPromise]);

      this.logger.log(`Email sent to ${to} via SMTP`);
      return { success: true };
    } catch (error) {
      this.logger.error(`SMTP failed for ${to}: ${error.message}`);
      return { success: false };
    }
  }

  // ==================== CRITICAL EMAILS (RESEND) ====================

  async sendWelcomeEmail({ name, email, code, role }): Promise<{ success: boolean }> {
    const isGlobalNetwork = role === 'GlobalNetwork';
    const html = WELCOME_EMAIL_TEMPLATE.replace('[Name]', name)
      .replace('[VerificationCode]', code)
      .replace(
        '[WelcomeHeading]',
        isGlobalNetwork ? 'Welcome to the CMDA Global Network' : 'Welcome to CMDA Nigeria!',
      )
      .replace(
        '[WelcomeIntro]',
        isGlobalNetwork
          ? 'We are delighted to begin onboarding you into the CMDA Global Network, our international community of Christian healthcare professionals. Complete your verification below to activate your account and continue your onboarding.'
          : "Thank you for registering with CMDA Nigeria! We are thrilled to have you on board. As part of our community, you'll have access to exclusive features and updates.",
      );
    return this.routeEmail({
      to: email,
      subject: isGlobalNetwork
        ? 'Welcome to the CMDA Global Network — Complete Your Onboarding'
        : 'Welcome to CMDA Nigeria',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  async sendPasswordResetTokenEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = PASSWORD_RESET_REQUEST_EMAIL_TEMPLATE.replace('[Name]', name).replace(
      '[ResetToken]',
      code,
    );
    return this.routeEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  async sendPasswordResetSuccessEmail({ name, email }): Promise<{ success: boolean }> {
    const html = PASSWORD_RESET_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name);
    return this.routeEmail({
      to: email,
      subject: 'Password Reset Successful',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  async sendVerificationCodeEmail({ name, email, code }): Promise<{ success: boolean }> {
    const html = VERIFICATION_CODE_EMAIL_TEMPLATE.replace('[Name]', name).replace(
      '[VerificationCode]',
      code,
    );
    return this.routeEmail({
      to: email,
      subject: 'Complete your CMDA Nigeria registration',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  async sendMemberCredentialsEmail({
    name,
    email,
    password,
    userId,
    role,
  }): Promise<{ success: boolean }> {
    const isGlobalNetwork = role === 'GlobalNetwork';
    const publicApiUrl = (
      this.configService.get<string>('PUBLIC_API_URL') ||
      'https://cmdabackend-38258a63fa98.herokuapp.com'
    ).replace(/\/$/, '');
    const trackingPixel = userId
      ? `<img src="${publicApiUrl}/admin/members/track-email/${userId}" width="1" height="1" alt="" style="display:none" />`
      : '';

    const html = MEMBER_CREDENTIALS_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[Password]', password)
      .replace(
        '[AccountHeading]',
        isGlobalNetwork
          ? 'Your CMDA Global Network Account Is Ready'
          : 'Your CMDA Nigeria Member Account Has Been Created',
      )
      .replace(
        '[AccountIntro]',
        isGlobalNetwork
          ? 'We are pleased to welcome and onboard you into the CMDA Global Network, our international community of Christian healthcare professionals. Your member account has been created so you can complete your profile and begin connecting with the network.'
          : 'We are pleased to inform you that a member account has been successfully created for you on the CMDA Nigeria Membership platform.',
      )
      .replace(
        '[ProfileReminder]',
        isGlobalNetwork
          ? 'After logging in, please complete your Global Network profile, including your contact details, region, specialty and professional information. A complete profile helps the network identify, support and connect with you.'
          : 'After logging in, please take a moment to complete your profile by updating any missing information, including your phone number and other personal details. This helps us serve you better.',
      )
      .replace('</div>', `${trackingPixel}</div>`);

    return this.routeEmail({
      to: email,
      subject: isGlobalNetwork
        ? 'Welcome to the CMDA Global Network — Your Account Details'
        : 'CMDA Member Account Credentials',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  async sendAdminCredentialsEmail({ name, email, password }): Promise<{ success: boolean }> {
    const html = ADMIN_CREDENTIALS_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[Password]', password);

    return this.routeEmail({
      to: email,
      subject: 'Admin Login Credentials',
      html,
      priority: EmailPriority.CRITICAL,
    });
  }

  // ==================== NORMAL EMAILS (RESEND IF AVAILABLE) ====================

  async sendDonationConfirmedEmail({ name, email }): Promise<{ success: boolean }> {
    const html = DONATION_CONFIRMATION_EMAIL_TEMPLATE.replace('[Name]', name);
    return this.routeEmail({
      to: email,
      subject: 'Thank You for your Generous Donation',
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendSubscriptionConfirmedEmail({ name, email }): Promise<{ success: boolean }> {
    const html = SUBSCRIPTION_CONFIRMATION_EMAIL_TEMPLATE.replace('[Name]', name);
    return this.routeEmail({
      to: email,
      subject: 'Thank You for Subscribing',
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendTransitionSuccessEmal({
    name,
    email,
    oldRole,
    newRole,
    licenseNumber,
    newRegion,
    specialty,
  }): Promise<{ success: boolean }> {
    const html = TRANSITION_SUCCESS_EMAIL_TEMPLATE.replace('[Name]', name)
      .replace('[TransitionFrom]', oldRole)
      .replace('[TransitionTo]', newRole)
      .replace('[Specialty]', specialty)
      .replace('[LicenseNumber]', licenseNumber)
      .replace('[Region]', newRegion);

    return this.routeEmail({
      to: email,
      subject: 'Transition Successful',
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendConferenceRegistrationConfirmationEmail({
    name,
    email,
    conferenceName,
    conferenceType,
    conferenceScope,
    conferenceDate,
    conferenceVenue,
    registrationPeriod,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    const html = CONFERENCE_REGISTRATION_CONFIRMATION_TEMPLATE.replace('[Name]', name)
      .replace(/\[ConferenceName\]/g, conferenceName)
      .replace('[ConferenceType]', conferenceType)
      .replace('[ConferenceScope]', conferenceScope)
      .replace('[ConferenceDate]', conferenceDate)
      .replace('[ConferenceVenue]', conferenceVenue)
      .replace('[RegistrationPeriod]', registrationPeriod)
      .replace('[ConferenceUrl]', conferenceUrl);

    return this.routeEmail({
      to: email,
      subject: `Registration Confirmed: ${conferenceName}`,
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendConferencePaymentConfirmationEmail({
    name,
    email,
    conferenceName,
    amountPaid,
    registrationPeriod,
    paymentMethod,
    transactionId,
    paymentDate,
    conferenceDate,
    conferenceVenue,
    conferenceType,
    conferenceScope,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    const html = CONFERENCE_PAYMENT_CONFIRMATION_TEMPLATE.replace('[Name]', name)
      .replace(/\[ConferenceName\]/g, conferenceName)
      .replace('[AmountPaid]', amountPaid)
      .replace('[RegistrationPeriod]', registrationPeriod)
      .replace('[PaymentMethod]', paymentMethod)
      .replace('[TransactionId]', transactionId)
      .replace('[PaymentDate]', paymentDate)
      .replace('[ConferenceDate]', conferenceDate)
      .replace('[ConferenceVenue]', conferenceVenue)
      .replace('[ConferenceType]', conferenceType)
      .replace('[ConferenceScope]', conferenceScope)
      .replace('[ConferenceUrl]', conferenceUrl);

    return this.routeEmail({
      to: email,
      subject: `Payment Confirmed: ${conferenceName}`,
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendConferenceUpdateNotificationEmail({
    name,
    email,
    conferenceName,
    updateMessage,
    conferenceDate,
    conferenceVenue,
    conferenceType,
    conferenceUrl,
  }): Promise<{ success: boolean }> {
    const html = CONFERENCE_UPDATE_NOTIFICATION_TEMPLATE.replace('[Name]', name)
      .replace(/\[ConferenceName\]/g, conferenceName)
      .replace('[UpdateMessage]', updateMessage)
      .replace('[ConferenceDate]', conferenceDate)
      .replace('[ConferenceVenue]', conferenceVenue)
      .replace('[ConferenceType]', conferenceType)
      .replace('[ConferenceUrl]', conferenceUrl);

    return this.routeEmail({
      to: email,
      subject: `Update: ${conferenceName}`,
      html,
      priority: EmailPriority.NORMAL,
    });
  }

  async sendEmail({
    to,
    subject,
    html,
  }: {
    to: string;
    subject: string;
    html: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const result = await this.routeEmail({ to, subject, html, priority: EmailPriority.NORMAL });
    return { success: result.success };
  }

  // ==================== LOW PRIORITY EMAILS (SMTP) ====================

  async sendBirthdayEmail({ to, subject, html }): Promise<{ success: boolean }> {
    return this.routeEmail({
      to,
      subject,
      html,
      priority: EmailPriority.LOW,
    });
  }

  async sendReminderEmail({ to, subject, html }): Promise<{ success: boolean }> {
    return this.routeEmail({
      to,
      subject,
      html,
      priority: EmailPriority.LOW,
    });
  }

  async sendPasswordChangeReminderEmail({
    name,
    email,
    createdDate,
  }): Promise<{ success: boolean }> {
    const html = PASSWORD_CHANGE_REMINDER_TEMPLATE.replace('[Name]', name)
      .replace('[Email]', email)
      .replace('[CreatedDate]', createdDate);

    return this.routeEmail({
      to: email,
      subject: 'Reminder: Please Change Your Temporary Password',
      html,
      priority: EmailPriority.LOW,
    });
  }

  async sendLifetimeMembershipEmail({
    name,
    email,
    membershipType,
    years,
    expiryDate,
  }): Promise<{ success: boolean }> {
    const html = `
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
            <h1 style="color: #ffffff; font-size: 24px; margin-top: 16px">🎉 Lifetime Membership Activated!</h1>
            </td>
        </tr>
        <!-- Body -->
        <tr>
            <td style="padding: 40px 30px">
            <h2 style="color: #333333; font-size: 22px; margin: 0">Dear ${name},</h2>
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Congratulations! Your <strong>Lifetime ${membershipType}</strong> membership has been successfully activated.
            </p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; border-left: 4px solid #994279; margin: 20px 0">
                <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0">Membership Details:</h3>
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Membership Type:</strong> ${membershipType}
                </p>
                ${
                  membershipType.includes('Nigerian')
                    ? ''
                    : `
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Duration:</strong> ${years} years
                </p>
                <p style="color: #666666; font-size: 16px; line-height: 1.8; margin: 5px 0">
                    <strong>Expiry Date:</strong> ${expiryDate}
                </p>
                `
                }
            </div>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                As a lifetime member, you now have access to all CMDA Nigeria benefits and services!
            </p>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 20px 0">
                Thank you for being so committed to CMDA Nigeria. We look forward to serving you.
            </p>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 40px 0 0 0">
                Best regards,<br />
                CMDA Nigeria Team
            </p>
            </td>
        </tr>
        <!-- Footer -->
        <tr>
            <td align="center" style="background-color: #f4f4f4; padding: 20px 0">
            <p style="color: #666666; font-size: 14px; margin: 0">
                &copy; ${new Date().getFullYear()} CMDA Nigeria. All rights reserved.
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

    return this.routeEmail({
      to: email,
      subject: `🎉 Lifetime Membership Activated - ${membershipType}`,
      html,
      priority: EmailPriority.LOW,
    });
  }
}
